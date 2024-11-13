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
  private readonly issuesByProject = new Map<string, Map<number, ImportIssue>>()
  private readonly documentsByTeamspace = new Map<string, Map<string, ImportDocument>>()
  private readonly errors = new Map<string, ValidationError>()

  constructor (
    private readonly strictMode: boolean = true
  ) {}

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

  addIssue (projectPath: string, issuePath: string, issue: ImportIssue): this {
    if (!this.issuesByProject.has(projectPath)) {
      this.issuesByProject.set(projectPath, new Map())
    }

    const projectIssues = this.issuesByProject.get(projectPath)
    if (projectIssues === undefined) {
      throw new Error(`Unexpected: Project ${projectPath} has no issues`)
    }

    if (projectIssues.has(issue.number)) {
      this.addError(issuePath, `Duplicate issue number ${issue.number} in project ${projectPath}`)
    } else {
      this.validateAndAdd(
        'issue',
        issuePath,
        issue,
        (i) => this.validateIssue(i),
        projectIssues,
        issue.number
      )
    }
    return this
  }

  addDocument (teamspacePath: string, docPath: string, doc: ImportDocument): this {
    if (!this.documentsByTeamspace.has(teamspacePath)) {
      this.documentsByTeamspace.set(teamspacePath, new Map())
    }

    const docs = this.documentsByTeamspace.get(teamspacePath)
    if (docs === undefined) {
      throw new Error(`Unexpected: Teamspace ${teamspacePath} has no documents`)
    }

    this.validateAndAdd(
      'document',
      docPath,
      doc,
      (d) => this.validateDocument(d),
      docs,
      docPath
    )
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
      throw new Error('Invalid workspace: ' +
        Array.from(validation.errors.values())
          .map(e => `${e.path}: ${e.error}`)
          .join(', ')
      )
    }

    for (const [teamspacePath, docs] of this.documentsByTeamspace) {
      const teamspace = this.teamspaces.get(teamspacePath)
      if (teamspace !== undefined) {
        teamspace.docs = Array.from(docs.values())
      }
    }

    for (const [projectPath, issues] of this.issuesByProject) {
      const project = this.projects.get(projectPath)
      if (project !== undefined) {
        project.docs = Array.from(issues.values())
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
      this.addError(path, `Invalid ${type}: ${errors.join(', ')}`)
      if (this.strictMode) {
        throw new Error(`Invalid ${type} at ${path}: ${errors.join(', ')}`)
      }
    } else {
      // Используем path как ключ, если key не предоставлен
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
    if (!this.validateStringDefined(project.name)) {
      errors.push('name is required')
    }
    if (!this.validateStringDefined(project.identifier)) {
      errors.push('identifier is required')
    }
    if (project.class !== 'tracker.class.Project') {
      errors.push('invalid class')
    }
    return errors
  }

  private validateTeamspace (teamspace: ImportTeamspace): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(teamspace.name)) {
      errors.push('name is required')
    }
    if (teamspace.class !== 'document.class.TeamSpace') {
      errors.push('invalid class')
    }
    return errors
  }

  private validateIssue (issue: ImportIssue): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(issue.title)) {
      errors.push('title is required')
    }
    if (issue.status === undefined || issue.status === null) {
      errors.push('status is required')
    }
    if (issue.class !== 'tracker.class.Issue') {
      errors.push('invalid class')
    }
    if (issue.number === undefined || issue.number <= 0) {
      errors.push('valid issue number is required')
    }
    return errors
  }

  private validateDocument (doc: ImportDocument): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(doc.title)) {
      errors.push('title is required')
    }
    if (doc.class !== 'document:class:Document') {
      errors.push('invalid class')
    }
    return errors
  }

  private validateProjectReferences (): void {
    // Validate project type references
    for (const project of this.projects.values()) {
      if (project.projectType !== undefined && !this.projectTypes.has(project.projectType.name)) {
        this.addError(project.name, `Referenced project type ${project.projectType.name} not found`)
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
}
