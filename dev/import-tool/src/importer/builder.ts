import { type DocumentQuery, type Ref, type Status, type TxOperations } from '@hcengineering/core'
import document from '@hcengineering/document'
import tracker, { IssuePriority, type IssueStatus } from '@hcengineering/tracker'
import {
  type ImportDocument,
  type ImportIssue,
  type ImportProject,
  type ImportProjectType,
  type ImportTeamspace,
  type ImportWorkspace
} from './importer'

export interface ValidationError {
  path: string
  error: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Map<string, ValidationError>
}

export class ImportWorkspaceBuilder {
  private readonly projects = new Map<string, ImportProject>()
  private readonly teamspaces = new Map<string, ImportTeamspace>()
  private readonly projectTypes = new Map<string, ImportProjectType>()
  private readonly issuesByProject = new Map<string, Map<string, ImportIssue>>()
  private readonly issueParents = new Map<string, string>()
  private readonly documentsByTeamspace = new Map<string, Map<string, ImportDocument>>()
  private readonly documentParents = new Map<string, string>()
  private readonly errors = new Map<string, ValidationError>()

  private readonly issueStatusCache = new Map<string, Ref<IssueStatus>>()

  constructor (
    private readonly client: TxOperations,
    private readonly strictMode: boolean = true
  ) {}

  async initCache (): Promise<this> {
    await this.cacheIssueStatuses()
    return this
  }

  addProjectType (projectType: ImportProjectType): this {
    this.validateAndAdd(
      'projectType',
      projectType.name,
      projectType,
      (pt) => this.validateProjectType(pt),
      this.projectTypes
    )
    return this
  }

  addProject (path: string, project: ImportProject): this {
    this.validateAndAdd(
      'project',
      path,
      project,
      (p) => this.validateProject(p),
      this.projects,
      path
    )
    return this
  }

  addTeamspace (path: string, teamspace: ImportTeamspace): this {
    this.validateAndAdd(
      'teamspace',
      path,
      teamspace,
      (t) => this.validateTeamspace(t),
      this.teamspaces,
      path
    )
    return this
  }

  addIssue (projectPath: string, issuePath: string, issue: ImportIssue, parentIssuePath?: string): this {
    if (!this.issuesByProject.has(projectPath)) {
      this.issuesByProject.set(projectPath, new Map())
    }

    const projectIssues = this.issuesByProject.get(projectPath)
    if (projectIssues === undefined) {
      throw new Error(`Project ${projectPath} not found`)
    }

    const duplicateIssue = Array.from(projectIssues.values())
      .find(existingIssue => existingIssue.number === issue.number)

    if (duplicateIssue !== undefined) {
      this.addError(issuePath, `Duplicate issue number ${issue.number} in project ${projectPath}`)
    } else {
      this.validateAndAdd(
        'issue',
        issuePath,
        issue,
        (i) => this.validateIssue(i),
        projectIssues,
        issuePath
      )

      if (parentIssuePath !== undefined) {
        this.issueParents.set(issuePath, parentIssuePath)
      }
    }
    return this
  }

  addDocument (teamspacePath: string, docPath: string, doc: ImportDocument, parentDocPath?: string): this {
    if (!this.documentsByTeamspace.has(teamspacePath)) {
      this.documentsByTeamspace.set(teamspacePath, new Map())
    }

    const docs = this.documentsByTeamspace.get(teamspacePath)
    if (docs === undefined) {
      throw new Error(`Teamspace ${teamspacePath} not found`)
    }

    this.validateAndAdd(
      'document',
      docPath,
      doc,
      (d) => this.validateDocument(d),
      docs,
      docPath
    )

    if (parentDocPath !== undefined) {
      this.documentParents.set(docPath, parentDocPath)
    }

    return this
  }

  validate (): ValidationResult {
    // Perform cross-entity validation
    this.validateProjectReferences()
    this.validateSpaceDocuments()

    return {
      isValid: this.errors.size === 0,
      errors: this.errors
    }
  }

  build (): ImportWorkspace {
    const validation = this.validate()
    if (this.strictMode && !validation.isValid) {
      throw new Error('Invalid workspace: \n' +
        Array.from(validation.errors.values())
          .map(e => `    * ${e.path}: ${e.error}`)
          .join(';\n')
      )
    }

    for (const [teamspacePath, docs] of this.documentsByTeamspace) {
      const teamspace = this.teamspaces.get(teamspacePath)
      if (teamspace !== undefined) {
        const rootDocPaths = Array.from(docs.keys())
          .filter(docPath => !this.documentParents.has(docPath))

        for (const rootPath of rootDocPaths) {
          this.buildDocumentHierarchy(rootPath, docs)
        }

        teamspace.docs = rootDocPaths.map(path => docs.get(path)).filter(Boolean) as ImportDocument[]
      }
    }

    for (const [projectPath, issues] of this.issuesByProject) {
      const project = this.projects.get(projectPath)
      if (project !== undefined) {
        const rootIssuePaths = Array.from(issues.keys())
          .filter(issuePath => !this.issueParents.has(issuePath))

        for (const rootPath of rootIssuePaths) {
          this.buildIssueHierarchy(rootPath, issues)
        }

        project.docs = rootIssuePaths.map(path => issues.get(path)).filter(Boolean) as ImportIssue[]
      }
    }

    return {
      projectTypes: Array.from(this.projectTypes.values()),
      spaces: [
        ...Array.from(this.projects.values()),
        ...Array.from(this.teamspaces.values())
      ]
    }
  }

  async cacheIssueStatuses (): Promise<void> {
    const query: DocumentQuery<Status> = {
      ofAttribute: tracker.attribute.IssueStatus
    }

    const statuses = await this.client.findAll(tracker.class.IssueStatus, query)
    for (const status of statuses) {
      this.issueStatusCache.set(status.name, status._id)
    }
  }

  private validateAndAdd<T, K>(
    type: string,
    path: string,
    item: T,
    validator: (item: T) => string[],
    collection: Map<K, T>,
    key?: K
  ): void {
    const errors = validator(item)
    if (errors.length > 0) {
      this.addError(path, `Invalid ${type} at ${path}: \n${errors.map(e => `    * ${e}`).join('\n')}`)
      if (this.strictMode) {
        throw new Error(`Invalid ${type} at ${path}: \n${errors.map(e => `    * ${e}`).join('\n')}`)
      }
    } else {
      collection.set((key ?? path) as K, item)
    }
  }

  private validateProjectType (projectType: ImportProjectType): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(projectType.name)) {
      errors.push('name is required')
    }
    return errors
  }

  private validateStringDefined (value: string | null | undefined): boolean {
    return value !== '' && value !== null && value !== undefined
  }

  private validateProject (project: ImportProject): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(project.title)) {
      errors.push('title is required')
    }
    if (!this.validateStringDefined(project.identifier)) {
      errors.push('identifier is required')
    }
    if (project.class !== tracker.class.Project) {
      errors.push('invalid class: ' + project.class)
    }
    return errors
  }

  private validateTeamspace (teamspace: ImportTeamspace): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(teamspace.title)) {
      errors.push('title is required')
    }
    if (teamspace.class !== document.class.Teamspace) {
      errors.push('invalid class: ' + teamspace.class)
    }
    return errors
  }

  private validateIssue (issue: ImportIssue): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(issue.title)) {
      errors.push('title is required')
    }
    if (issue.status == null) {
      errors.push('status is required: ')
    } else if (!this.issueStatusCache.has(issue.status.name)) {
      errors.push('status not found: ' + issue.status.name)
    }
    if (issue.priority != null && IssuePriority[issue.priority as keyof typeof IssuePriority] === undefined) {
      errors.push('priority not found: ' + issue.priority)
    }
    if (issue.class !== tracker.class.Issue) {
      errors.push('invalid class: ' + issue.class)
    }
    if (issue.number !== undefined && (issue.number < 0 || Number.isNaN(issue.number))) {
      errors.push('invalid issue number: ' + issue.number)
    }
    return errors
  }

  private validateDocument (doc: ImportDocument): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(doc.title)) {
      errors.push('title is required')
    }
    if (doc.class !== document.class.Document) {
      errors.push('invalid class: ' + doc.class)
    }
    return errors
  }

  private validateProjectReferences (): void {
    // Validate project type references
    for (const project of this.projects.values()) {
      if (project.projectType !== undefined && !this.projectTypes.has(project.projectType.name)) {
        this.addError(project.title, `Referenced project type ${project.projectType.name} not found`)
      }
    }
  }

  private validateSpaceDocuments (): void {
    // Validate that issues belong to projects and documents to teamspaces
    for (const projectPath of this.issuesByProject.keys()) {
      if (!this.projects.has(projectPath)) {
        this.addError(projectPath, 'Issues reference non-existent project')
      }
    }

    for (const [teamspacePath] of this.documentsByTeamspace) {
      if (!this.teamspaces.has(teamspacePath)) {
        this.addError(teamspacePath, 'Documents reference non-existent teamspace')
      }
    }
  }

  private addError (path: string, error: string): void {
    this.errors.set(path, { path, error })
  }

  private buildDocumentHierarchy (
    docPath: string,
    allDocs: Map<string, ImportDocument>
  ): void {
    const doc = allDocs.get(docPath)
    if (doc === undefined) return

    const childDocs = Array.from(allDocs.entries())
      .filter(([childPath]) => this.documentParents.get(childPath) === docPath)
      .map(([childPath, childDoc]) => {
        this.buildDocumentHierarchy(childPath, allDocs)
        return childDoc
      })

    doc.subdocs = childDocs
  }

  private buildIssueHierarchy (
    issuePath: string,
    allIssues: Map<string, ImportIssue>
  ): void {
    const issue = allIssues.get(issuePath)
    if (issue === undefined) return

    const childIssues = Array.from(allIssues.entries())
      .filter(([childPath]) => this.issueParents.get(childPath) === issuePath)
      .map(([childPath, childIssue]) => {
        this.buildIssueHierarchy(childPath, allIssues)
        return childIssue
      })

    issue.subdocs = childIssues
  }
}
