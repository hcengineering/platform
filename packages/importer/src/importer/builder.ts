//
// Copyright © 2024 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
//
import card, { Card, MasterTag, Tag } from '@hcengineering/card'
import documents, { ControlledDocument, DocumentState } from '@hcengineering/controlled-documents'
import core, { Attribute, type DocumentQuery, type Ref, type Status, type TxOperations } from '@hcengineering/core'
import document from '@hcengineering/document'
import tracker, { IssuePriority, type IssueStatus } from '@hcengineering/tracker'
import {
  ImportControlledDocument,
  ImportControlledDocumentTemplate,
  ImportOrgSpace,
  type ImportControlledDoc,
  type ImportDocument,
  type ImportIssue,
  type ImportProject,
  type ImportProjectType,
  type ImportTeamspace,
  type ImportWorkspace
} from './importer'
import { UnifiedDoc } from '../types'

export interface ValidationError {
  path: string
  error: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Map<string, ValidationError>
}

const MAX_PROJECT_IDENTIFIER_LENGTH = 5
const PROJECT_IDENTIFIER_REGEX = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export class ImportWorkspaceBuilder {
  private readonly projects = new Map<string, ImportProject>()
  private readonly issuesByProject = new Map<string, Map<string, ImportIssue>>()
  private readonly issueParents = new Map<string, string>()

  private readonly teamspaces = new Map<string, ImportTeamspace>()
  private readonly documentsByTeamspace = new Map<string, Map<string, ImportDocument>>()
  private readonly documentParents = new Map<string, string>()

  private readonly qmsSpaces = new Map<string, ImportOrgSpace>()
  private readonly qmsTemplates = new Map<Ref<ControlledDocument>, string>()
  private readonly qmsDocsBySpace = new Map<string, Map<string, ImportControlledDoc>>()
  private readonly qmsDocsParents = new Map<string, string>()

  private readonly masterTags = new Map<string, UnifiedDoc<MasterTag>>()
  private readonly masterTagAttributes = new Map<string, UnifiedDoc<Attribute<MasterTag>>>()
  private readonly tags = new Map<string, UnifiedDoc<Tag>>()
  private readonly cards = new Map<string, UnifiedDoc<Card>>()
  private readonly cardParents = new Map<string, string>()

  private readonly projectTypes = new Map<string, ImportProjectType>()
  private readonly issueStatusCache = new Map<string, Ref<IssueStatus>>()
  private readonly errors = new Map<string, ValidationError>()

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
    this.validateAndAdd('project', path, project, (p) => this.validateProject(p), this.projects, path)
    return this
  }

  addTeamspace (path: string, teamspace: ImportTeamspace): this {
    this.validateAndAdd('teamspace', path, teamspace, (t) => this.validateTeamspace(t), this.teamspaces, path)
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

    const duplicateIssue = Array.from(projectIssues.values()).find(
      (existingIssue) => existingIssue.number === issue.number
    )

    if (duplicateIssue !== undefined) {
      this.addError(issuePath, `Duplicate issue number ${issue.number} in project ${projectPath}`)
    } else {
      this.validateAndAdd('issue', issuePath, issue, (i) => this.validateIssue(i), projectIssues, issuePath)

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

    this.validateAndAdd('document', docPath, doc, (d) => this.validateDocument(d), docs, docPath)

    if (parentDocPath !== undefined) {
      this.documentParents.set(docPath, parentDocPath)
    }

    return this
  }

  addOrgSpace (path: string, space: ImportOrgSpace): this {
    this.validateAndAdd('documentSpace', path, space, (s) => this.validateOrgSpace(s), this.qmsSpaces, path)
    return this
  }

  addControlledDocument (
    spacePath: string,
    docPath: string,
    doc: ImportControlledDocument,
    parentDocPath?: string
  ): this {
    if (!this.qmsDocsBySpace.has(spacePath)) {
      this.qmsDocsBySpace.set(spacePath, new Map())
    }

    const docs = this.qmsDocsBySpace.get(spacePath)
    if (docs === undefined) {
      throw new Error(`Document space ${spacePath} not found`)
    }

    if (doc.code !== undefined) {
      const duplicateDoc = Array.from(docs.values()).find((existingDoc) => existingDoc.code === doc.code)
      if (duplicateDoc !== undefined) {
        throw new Error(`Duplicate document code ${doc.code} in space ${spacePath}`)
      }
    }

    this.validateAndAdd(
      'controlledDocument',
      docPath,
      doc,
      (d) => this.validateControlledDocument(d as ImportControlledDocument),
      docs,
      docPath
    )

    if (parentDocPath !== undefined) {
      this.qmsDocsParents.set(docPath, parentDocPath)
    }

    return this
  }

  addControlledDocumentTemplate (
    spacePath: string,
    templatePath: string,
    template: ImportControlledDocumentTemplate,
    parentTemplatePath?: string
  ): this {
    if (!this.qmsDocsBySpace.has(spacePath)) {
      this.qmsDocsBySpace.set(spacePath, new Map())
    }

    const qmsDocs = this.qmsDocsBySpace.get(spacePath)
    if (qmsDocs === undefined) {
      throw new Error(`Document space ${spacePath} not found`)
    }

    if (template.code !== undefined) {
      const duplicate = Array.from(qmsDocs.values()).find((existingDoc) => existingDoc.code === template.code)
      if (duplicate !== undefined) {
        throw new Error(`Duplicate document code ${template.code} in space ${spacePath}`)
      }
    }

    this.validateAndAdd(
      'documentTemplate',
      templatePath,
      template,
      (t) => this.validateControlledDocumentTemplate(t as ImportControlledDocumentTemplate),
      qmsDocs,
      templatePath
    )

    if (parentTemplatePath !== undefined) {
      this.qmsDocsParents.set(templatePath, parentTemplatePath)
    }

    if (template.id !== undefined) {
      this.qmsTemplates.set(template.id, templatePath)
    }

    return this
  }

  addMasterTag (path: string, masterTag: UnifiedDoc<MasterTag>): this {
    this.validateAndAdd('masterTag', path, masterTag, (mt) => this.validateMasterTag(mt), this.masterTags, path)
    return this
  }

  addTag (path: string, tag: UnifiedDoc<Tag>): this {
    this.validateAndAdd('tag', path, tag, (t) => this.validateTag(t), this.tags, path)
    return this
  }

  addMasterTagAttributes (path: string, attributes: UnifiedDoc<Attribute<MasterTag>>[]): this {
    for (const attribute of attributes) {
      const key = path + '/' + attribute.props.name
      this.validateAndAdd('masterTagAttribute', key, attribute, (a) => this.validateMasterTagAttribute(a), this.masterTagAttributes, key)
    }
    return this
  }

  addCard (path: string, card: UnifiedDoc<Card>, parentCardPath?: string): this {
    this.validateAndAdd('card', path, card, (c) => this.validateCard(c), this.cards, path)

    if (parentCardPath !== undefined) {
      this.cardParents.set(path, parentCardPath)
    }

    return this
  }

  validate (): ValidationResult {
    // Perform cross-entity validation
    this.validateSpacesReferences()
    this.validateDocumentsReferences()
    this.validateTagsReferences()
    this.validateCardsReferences()

    return {
      isValid: this.errors.size === 0,
      errors: this.errors
    }
  }

  build (): ImportWorkspace {
    const validation = this.validate()
    if (this.strictMode && !validation.isValid) {
      throw new Error(
        'Invalid workspace: \n' +
          Array.from(validation.errors.values())
            .map((e) => `    * ${e.path}: ${e.error}`)
            .join(';\n')
      )
    }

    for (const [teamspacePath, docs] of this.documentsByTeamspace) {
      const teamspace = this.teamspaces.get(teamspacePath)
      if (teamspace !== undefined) {
        const rootDocPaths = Array.from(docs.keys()).filter((docPath) => !this.documentParents.has(docPath))

        for (const rootPath of rootDocPaths) {
          this.buildDocumentHierarchy(rootPath, docs)
        }

        teamspace.docs = rootDocPaths.map((path) => docs.get(path)).filter(Boolean) as ImportDocument[]
      }
    }

    for (const [projectPath, issues] of this.issuesByProject) {
      const project = this.projects.get(projectPath)
      if (project !== undefined) {
        const rootIssuePaths = Array.from(issues.keys()).filter((issuePath) => !this.issueParents.has(issuePath))

        for (const rootPath of rootIssuePaths) {
          this.buildIssueHierarchy(rootPath, issues)
        }

        project.docs = rootIssuePaths.map((path) => issues.get(path)).filter(Boolean) as ImportIssue[]
      }
    }

    for (const [spacePath, qmsDocs] of this.qmsDocsBySpace) {
      const space = this.qmsSpaces.get(spacePath)
      if (space !== undefined) {
        const rootDocPaths = Array.from(qmsDocs.keys()).filter((docPath) => !this.qmsDocsParents.has(docPath))

        for (const rootPath of rootDocPaths) {
          this.buildControlledDocumentHierarchy(rootPath, qmsDocs)
        }

        space.docs = rootDocPaths.map((path) => qmsDocs.get(path)).filter(Boolean) as ImportControlledDocument[]
      }
    }

    // Добавляем обработку иерархии карточек
    const rootCardPaths = Array.from(this.cards.keys())
      .filter(cardPath => !this.cardParents.has(cardPath))

    for (const rootPath of rootCardPaths) {
      this.buildCardHierarchy(rootPath, this.cards)
    }

    return {
      projectTypes: Array.from(this.projectTypes.values()),
      spaces: [
        ...Array.from(this.projects.values()),
        ...Array.from(this.teamspaces.values()),
        ...Array.from(this.qmsSpaces.values())
      ],
      unifiedDocs: [
        ...Array.from(this.masterTags.values()),
        ...Array.from(this.masterTagAttributes.values()),
        ...Array.from(this.tags.values()),
        ...Array.from(this.cards.values())
      ],
      attachments: []
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
      this.addError(path, `Invalid ${type} at ${path}: \n${errors.map((e) => `    * ${e}`).join('\n')}`)
      if (this.strictMode) {
        throw new Error(`Invalid ${type} at ${path}: \n${errors.map((e) => `    * ${e}`).join('\n')}`)
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

  private validateProject (project: ImportProject): string[] {
    const errors: string[] = []

    errors.push(...this.validateType(project.title, 'string', 'title'))
    errors.push(...this.validateType(project.identifier, 'string', 'identifier'))
    errors.push(...this.validateType(project.class, 'string', 'class'))

    if (project.private !== undefined) {
      errors.push(...this.validateType(project.private, 'boolean', 'private'))
    }

    if (project.autoJoin !== undefined) {
      errors.push(...this.validateType(project.autoJoin, 'boolean', 'autoJoin'))
    }

    if (project.owners !== undefined) {
      errors.push(...this.validateArray(project.owners, 'string', 'owners'))
    }

    if (project.members !== undefined) {
      errors.push(...this.validateArray(project.members, 'string', 'members'))
    }

    if (project.description !== undefined) {
      errors.push(...this.validateType(project.description, 'string', 'description'))
    }

    if (!this.validateStringDefined(project.title)) {
      errors.push('title is required')
    }

    if (project.class !== tracker.class.Project) {
      errors.push('invalid class: ' + project.class)
    }

    if (project.defaultIssueStatus !== undefined && !this.issueStatusCache.has(project.defaultIssueStatus.name)) {
      errors.push('defaultIssueStatus not found: ' + project.defaultIssueStatus.name)
    }

    if (project.id !== undefined && project.id !== tracker.project.DefaultProject) {
      errors.push('update operation is only allowed for tracker:project:DefaultProject')
    }

    if (project.archived !== undefined) {
      errors.push(...this.validateType(project.archived, 'boolean', 'archived'))
    }

    if (project.emoji !== undefined) {
      errors.push(...this.validateEmoji(project.emoji))
    }

    errors.push(...this.validateProjectIdentifier(project.identifier))
    return errors
  }

  private validateProjectIdentifier (identifier: string): string[] {
    const errors: string[] = []
    if (!this.validateStringDefined(identifier)) {
      errors.push('identifier is required')
      return errors
    }
    if (identifier.length > MAX_PROJECT_IDENTIFIER_LENGTH) {
      errors.push(`identifier must be no longer than ${MAX_PROJECT_IDENTIFIER_LENGTH} characters`)
    }
    if (!PROJECT_IDENTIFIER_REGEX.test(identifier)) {
      errors.push(
        'identifier must contain only Latin letters, numbers, and underscores, and must not start with a number'
      )
    }
    return errors
  }

  private validateTeamspace (teamspace: ImportTeamspace): string[] {
    const errors: string[] = []

    errors.push(...this.validateType(teamspace.title, 'string', 'title'))
    errors.push(...this.validateType(teamspace.class, 'string', 'class'))

    if (teamspace.private !== undefined) {
      errors.push(...this.validateType(teamspace.private, 'boolean', 'private'))
    }

    if (teamspace.autoJoin !== undefined) {
      errors.push(...this.validateType(teamspace.autoJoin, 'boolean', 'autoJoin'))
    }

    if (teamspace.owners !== undefined) {
      errors.push(...this.validateArray(teamspace.owners, 'string', 'owners'))
    }

    if (teamspace.members !== undefined) {
      errors.push(...this.validateArray(teamspace.members, 'string', 'members'))
    }

    if (teamspace.description !== undefined) {
      errors.push(...this.validateType(teamspace.description, 'string', 'description'))
    }

    if (teamspace.archived !== undefined) {
      errors.push(...this.validateType(teamspace.archived, 'boolean', 'archived'))
    }

    if (teamspace.emoji !== undefined) {
      errors.push(...this.validateType(teamspace.emoji, 'string', 'emoji'))
    }

    if (teamspace.emoji !== undefined) {
      errors.push(...this.validateEmoji(teamspace.emoji))
    }

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

    errors.push(...this.validateType(issue.title, 'string', 'title'))
    errors.push(...this.validateType(issue.class, 'string', 'class'))

    if (issue.number !== undefined) {
      errors.push(...this.validateType(issue.number, 'number', 'number'))
    }

    if (issue.estimation !== undefined) {
      errors.push(...this.validateType(issue.estimation, 'number', 'estimation'))
    }

    if (issue.remainingTime !== undefined) {
      errors.push(...this.validateType(issue.remainingTime, 'number', 'remainingTime'))
    }

    if (issue.priority !== undefined) {
      errors.push(...this.validateType(issue.priority, 'string', 'priority'))
    }

    if (issue.assignee !== undefined) {
      errors.push(...this.validateType(issue.assignee, 'string', 'assignee'))
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
    if (issue.number !== undefined && !this.validatePossitiveNumber(issue.number)) {
      errors.push('invalid issue number: ' + issue.number)
    }
    if (issue.estimation != null && !this.validatePossitiveNumber(issue.estimation)) {
      errors.push('invalid estimation: ' + issue.estimation)
    }
    if (issue.remainingTime != null && !this.validatePossitiveNumber(issue.remainingTime)) {
      errors.push('invalid remaining time: ' + issue.remainingTime)
    }
    if (issue.comments != null && issue.comments.length > 0) {
      for (const comment of issue.comments) {
        if (comment.author == null) {
          errors.push('comment author is required')
        }
        if (!this.validateStringDefined(comment.text)) {
          errors.push('comment text is required')
        }
      }
    }
    return errors
  }

  private validatePossitiveNumber (value: any): boolean {
    return typeof value === 'number' && !Number.isNaN(value) && value >= 0
  }

  private validateStringDefined (value: string | null | undefined): boolean {
    return typeof value === 'string' && value !== '' && value !== null && value !== undefined
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

  private validateSpacesReferences (): void {
    // Validate project type references
    for (const project of this.projects.values()) {
      if (project.projectType !== undefined && !this.projectTypes.has(project.projectType.name)) {
        this.addError(project.title, `Referenced project type ${project.projectType.name} not found`)
      }
    }
  }

  private validateDocumentsReferences (): void {
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

    for (const [orgSpacePath, docs] of this.qmsDocsBySpace) {
      if (!this.qmsSpaces.has(orgSpacePath)) {
        this.addError(orgSpacePath, 'Controlled document reference non-existent orgSpace')
      }
      for (const [docPath, doc] of docs) {
        if (doc.class === documents.class.ControlledDocument) {
          const templateRef = (doc as ImportControlledDocument).template
          const templatePath = this.qmsTemplates.get(templateRef)
          if (templatePath === undefined) {
            this.addError(docPath, 'Controlled document reference non-existent template')
          } else if (!docs.has(templatePath)) {
            this.addError(docPath, 'Controlled document reference not in space')
          }
        }
      }
    }
  }

  private validateCardsReferences (): void {
    // Проверка существования атрибутов
    for (const [cardPath, card] of this.cards) {
      if (card._class !== undefined) {
        const masterTag = this.masterTags.get(card._class)
        if (masterTag !== undefined) {
          const attributes = Array.from(this.masterTagAttributes.values())
            .filter(a => a.props.attributeOf === card._class)

          // Проверяем, что все используемые атрибуты существуют
          for (const [attrName] of Object.entries(card.props)) {
            if (attrName !== 'title' && !attributes.some(a => a.props.name === attrName)) {
              this.addError(cardPath, `Card uses non-existent attribute: ${attrName}`)
            }
          }
        }
      }

      // Проверка существования родительской карточки по ID
      if (card.props.parentId !== undefined) {
        const parentExists = Array.from(this.cards.values()).some(c => c.props.id === card.props.parentId)
        if (!parentExists) {
          this.addError(cardPath, `Parent card with ID ${card.props.parentId} does not exist`)
        }
      }

      // Проверка на циклические зависимости
      if (card.props.parentId !== undefined) {
        let currentCard = card
        const visitedIds = new Set<string>()

        while (currentCard.props.parentId !== undefined) {
          if (visitedIds.has(currentCard.props.parentId)) {
            this.addError(cardPath, 'Circular dependency detected in card hierarchy')
            break
          }

          visitedIds.add(currentCard.props.parentId)
          const parentCard = Array.from(this.cards.values()).find(c => c.props.id === currentCard.props.parentId)
          if (!parentCard) break
          currentCard = parentCard
        }
      }
    }
  }

  private validateTagsReferences (): void {
    // Проверка ссылок MasterTag
    for (const [path, masterTag] of this.masterTags) {
      if (masterTag.props.extends !== undefined) {
        if (masterTag.props.extends !== card.class.Card &&
            !this.masterTags.has(masterTag.props.extends)) {
          this.addError(path, `Invalid extends reference: ${masterTag.props.extends}`)
        }
      }
    }

    // Проверка ссылок Tag
    for (const [path, tag] of this.tags) {
      if (tag.props.extends === undefined) {
        this.addError(path, 'extends (MasterTag reference) is required')
      } else if (!this.masterTags.has(tag.props.extends)) {
        this.addError(path, `Invalid MasterTag reference: ${tag.props.extends}`)
      }
    }

    // Проверка ссылок атрибутов
    for (const [path, attribute] of this.masterTagAttributes) {
      if (attribute.props.attributeOf === undefined) {
        this.addError(path, 'attributeOf (MasterTag reference) is required')
      } else if (!this.masterTags.has(attribute.props.attributeOf)) {
        this.addError(path, `Invalid MasterTag reference: ${attribute.props.attributeOf}`)
      }
    }

    // Проверка ссылок карточек
    for (const [path, card] of this.cards) {
      if (card._class === undefined) {
        this.addError(path, 'class (MasterTag reference) is required')
      } else if (!this.masterTags.has(card._class)) {
        this.addError(path, `Invalid MasterTag reference: ${card._class}`)
      }
    }
  }

  private addError (path: string, error: string): void {
    this.errors.set(path, { path, error })
  }

  private buildDocumentHierarchy (docPath: string, allDocs: Map<string, ImportDocument>): void {
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

  private buildIssueHierarchy (issuePath: string, allIssues: Map<string, ImportIssue>): void {
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

  private buildControlledDocumentHierarchy (docPath: string, allDocs: Map<string, ImportControlledDoc>): void {
    const doc = allDocs.get(docPath)
    if (doc === undefined) return

    const childDocs = Array.from(allDocs.entries())
      .filter(([childPath]) => this.qmsDocsParents.get(childPath) === docPath)
      .map(([childPath, childDoc]) => {
        this.buildControlledDocumentHierarchy(childPath, allDocs)
        return childDoc
      })

    doc.subdocs = childDocs
  }

  private validateEmoji (emoji: string): string[] {
    const errors: string[] = []
    if (typeof emoji === 'string' && emoji.codePointAt(0) == null) {
      errors.push('Invalid emoji: ' + emoji)
    }
    return errors
  }

  private validateType (value: unknown, type: 'string' | 'number' | 'boolean', fieldName: string): string[] {
    const errors: string[] = []
    switch (type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${fieldName} must be string, got ${typeof value}`)
        }
        break
      case 'number':
        if (typeof value !== 'number') {
          errors.push(`${fieldName} must be number, got ${typeof value}`)
        }
        break
      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`${fieldName} must be boolean, got ${typeof value}`)
        }
        break
    }
    return errors
  }

  private validateArray (value: unknown, itemType: 'string' | 'number' | 'boolean', fieldName: string): string[] {
    const errors: string[] = []
    if (!Array.isArray(value)) {
      errors.push(`${fieldName} must be an array`)
      return errors
    }

    for (let i = 0; i < value.length; i++) {
      switch (itemType) {
        case 'string':
          if (typeof value[i] !== 'string') {
            errors.push(`${fieldName}[${i}] must be string, got ${typeof value[i]}`)
          }
          break
        case 'number':
          if (typeof value[i] !== 'number') {
            errors.push(`${fieldName}[${i}] must be number, got ${typeof value[i]}`)
          }
          break
        case 'boolean':
          if (typeof value[i] !== 'boolean') {
            errors.push(`${fieldName}[${i}] must be boolean, got ${typeof value[i]}`)
          }
          break
      }
    }
    return errors
  }

  private validateMasterTag (masterTag: UnifiedDoc<MasterTag>): string[] {
    const errors: string[] = []

    // Проверка класса
    if (masterTag._class !== card.class.MasterTag) {
      errors.push('Invalid class: ' + masterTag._class)
    }

    // Проверка обязательных полей
    if (!this.validateStringDefined(masterTag.props.label)) {
      errors.push('label is required')
    }

    // Проверка уникальности имени
    const existingTags = Array.from(this.masterTags.values())
      .filter(tag => tag.props.label === masterTag.props.label)
    if (existingTags.length > 0) {
      errors.push(`MasterTag with label "${masterTag.props.label}" already exists`)
    }

    return errors
  }

  private validateTag (tag: UnifiedDoc<Tag>): string[] {
    const errors: string[] = []

    // Проверка класса
    if (tag._class !== card.class.Tag) {
      errors.push('Invalid class: ' + tag._class)
    }

    // Проверка обязательных полей
    if (!this.validateStringDefined(tag.props.label)) {
      errors.push('label is required')
    }

    // Проверка уникальности имени в рамках MasterTag
    const existingTags = Array.from(this.tags.values())
      .filter(t => t.props.extends === tag.props.extends &&
                   t.props.label === tag.props.label)
    if (existingTags.length > 0) {
      errors.push(`Tag with label "${tag.props.label}" already exists for this MasterTag`)
    }

    return errors
  }

  private validateMasterTagAttribute (attribute: UnifiedDoc<Attribute<MasterTag>>): string[] {
    const errors: string[] = []

    // Проверка класса
    if (attribute._class !== core.class.Attribute) {
      errors.push('Invalid class: ' + attribute._class)
    }

    // Проверка обязательных полей
    if (!this.validateStringDefined(attribute.props.name)) {
      errors.push('name is required')
    }
    if (!this.validateStringDefined(attribute.props.label)) {
      errors.push('label is required')
    }

    // Проверка связи с MasterTag
    if (attribute.props.attributeOf === undefined) {
      errors.push('attributeOf (MasterTag reference) is required')
    } else if (!this.masterTags.has(attribute.props.attributeOf)) {
      errors.push(`Invalid MasterTag reference: ${attribute.props.attributeOf}`)
    }

    // Проверка типа атрибута
    if (attribute.props.type === undefined) {
      errors.push('type is required')
    } else {
      const validTypes = [ // todo: double check valid types
        'TypeString', 'TypeNumber', 'TypeBoolean', 'TypeDate',
        'TypeHyperlink', 'TypeEnum', 'TypeFileSize', 'TypeIntlString',
        'TypeMarkup', 'TypeTimestamp', 'TypeRef', 'TypeCollection'
      ]
      if (!validTypes.includes(attribute.props.type)) {
        errors.push(`Invalid attribute type: ${attribute.props.type}`)
      }
    }

    // Проверка уникальности имени атрибута в рамках MasterTag
    const existingAttributes = Array.from(this.masterTagAttributes.values())
      .filter(a => a.props.attributeOf === attribute.props.attributeOf &&
                   a.props.name === attribute.props.name)
    if (existingAttributes.length > 0) {
      errors.push(`Attribute with name "${attribute.props.name}" already exists for this MasterTag`)
    }

    return errors
  }

  private validateCard (card: UnifiedDoc<Card>): string[] {
    const errors: string[] = []

    // Проверка класса (должен быть ссылкой на MasterTag)
    if (card._class === undefined) {
      errors.push('class (MasterTag reference) is required')
    } else if (!this.masterTags.has(card._class)) {
      errors.push(`Invalid MasterTag reference: ${card._class}`)
    }

    // Проверка обязательных полей
    if (!this.validateStringDefined(card.props.title)) {
      errors.push('title is required')
    }

    // Получаем MasterTag и его атрибуты
    const masterTag = this.masterTags.get(card._class)
    if (masterTag !== undefined) {
      const attributes = Array.from(this.masterTagAttributes.values())
        .filter(a => a.props.attributeOf === card._class)

      // Проверяем значения атрибутов
      for (const attribute of attributes) {
        const value = (card.props as Record<string, unknown>)[attribute.props.name]

        // Проверка обязательных атрибутов
        // todo: check if required attribute is missing
        // if (attribute.props.required && value === undefined) {
        //   errors.push(`Required attribute "${attribute.props.label}" is missing`)
        //   continue
        // }

        // Проверка типов данных
        if (value !== undefined) {
          switch (attribute.props.type) {
            case 'TypeString':
              if (typeof value !== 'string') {
                errors.push(`Attribute "${attribute.props.label}" must be a string`)
              }
              break
            case 'TypeNumber':
              if (typeof value !== 'number') {
                errors.push(`Attribute "${attribute.props.label}" must be a number`)
              }
              break
            case 'TypeBoolean':
              if (typeof value !== 'boolean') {
                errors.push(`Attribute "${attribute.props.label}" must be a boolean`)
              }
              break
            case 'TypeDate':
              if (!(value instanceof Date)) {
                errors.push(`Attribute "${attribute.props.label}" must be a date`)
              }
              break
            // todo: add other types as needed
          }
        }
      }
    }

    return errors
  }

  private validateOrgSpace (space: ImportOrgSpace): string[] {
    const errors: string[] = []

    if (space.class !== documents.class.OrgSpace) {
      errors.push('Invalid space class: ' + space.class)
    }

    errors.push(...this.validateType(space.title, 'string', 'title'))

    if (space.emoji !== undefined) {
      errors.push(...this.validateEmoji(space.emoji))
    }

    if (space.owners !== undefined) {
      errors.push(...this.validateArray(space.owners, 'string', 'owners'))
    }

    if (space.members !== undefined) {
      errors.push(...this.validateArray(space.members, 'string', 'members'))
    }

    return errors
  }

  private validateControlledDocument (doc: ImportControlledDocument): string[] {
    const errors: string[] = []

    // Validate required fields presence and types
    errors.push(...this.validateType(doc.title, 'string', 'title'))
    errors.push(...this.validateType(doc.class, 'string', 'class'))
    errors.push(...this.validateType(doc.template, 'string', 'template'))
    errors.push(...this.validateType(doc.state, 'string', 'state'))
    if (doc.code !== undefined) {
      errors.push(...this.validateType(doc.code, 'string', 'code'))
    }

    // Validate required string fields are defined
    if (!this.validateStringDefined(doc.title)) errors.push('title is required')
    if (!this.validateStringDefined(doc.template)) errors.push('template is required')

    // Validate numbers are positive
    if (!this.validatePossitiveNumber(doc.major)) errors.push('invalid value for field "major"')
    if (!this.validatePossitiveNumber(doc.minor)) errors.push('invalid value for field "minor"')

    // Validate arrays
    errors.push(...this.validateArray(doc.reviewers, 'string', 'reviewers'))
    errors.push(...this.validateArray(doc.approvers, 'string', 'approvers'))
    errors.push(...this.validateArray(doc.coAuthors, 'string', 'coAuthors'))

    // Validate optional fields if present
    if (doc.author !== undefined) {
      errors.push(...this.validateType(doc.author, 'string', 'author'))
    }
    if (doc.owner !== undefined) {
      errors.push(...this.validateType(doc.owner, 'string', 'owner'))
    }
    if (doc.abstract !== undefined) {
      errors.push(...this.validateType(doc.abstract, 'string', 'abstract'))
    }
    if (doc.ccDescription !== undefined) {
      errors.push(...this.validateType(doc.ccDescription, 'string', 'ccDescription'))
    }
    if (doc.ccImpact !== undefined) {
      errors.push(...this.validateType(doc.ccImpact, 'string', 'ccImpact'))
    }
    if (doc.ccReason !== undefined) {
      errors.push(...this.validateType(doc.ccReason, 'string', 'ccReason'))
    }

    // Validate class
    if (doc.class !== documents.class.ControlledDocument) {
      errors.push('invalid class: ' + doc.class)
    }

    // Validate state values
    if (doc.state !== DocumentState.Draft) {
      errors.push('invalid state: ' + doc.state)
    }

    // todo: validate seqNumber is not duplicated (unique prefix? code?)

    return errors
  }

  private validateControlledDocumentTemplate (template: ImportControlledDocumentTemplate): string[] {
    const errors: string[] = []

    // Validate required fields presence and types
    errors.push(...this.validateType(template.title, 'string', 'title'))
    errors.push(...this.validateType(template.class, 'string', 'class'))
    errors.push(...this.validateType(template.docPrefix, 'string', 'docPrefix'))
    errors.push(...this.validateType(template.state, 'string', 'state'))
    if (template.code !== undefined) {
      errors.push(...this.validateType(template.code, 'string', 'code'))
    }

    // Validate required string fields are defined
    if (!this.validateStringDefined(template.title)) errors.push('title is required')
    if (!this.validateStringDefined(template.docPrefix)) errors.push('docPrefix is required')

    // Validate numbers are positive
    if (!this.validatePossitiveNumber(template.major)) errors.push('invalid value for field "major"')
    if (!this.validatePossitiveNumber(template.minor)) errors.push('invalid value for field "minor"')

    // Validate arrays
    errors.push(...this.validateArray(template.reviewers, 'string', 'reviewers'))
    errors.push(...this.validateArray(template.approvers, 'string', 'approvers'))
    errors.push(...this.validateArray(template.coAuthors, 'string', 'coAuthors'))

    // Validate optional fields if present
    if (template.author !== undefined) {
      errors.push(...this.validateType(template.author, 'string', 'author'))
    }
    if (template.owner !== undefined) {
      errors.push(...this.validateType(template.owner, 'string', 'owner'))
    }
    if (template.abstract !== undefined) {
      errors.push(...this.validateType(template.abstract, 'string', 'abstract'))
    }
    if (template.ccDescription !== undefined) {
      errors.push(...this.validateType(template.ccDescription, 'string', 'ccDescription'))
    }
    if (template.ccImpact !== undefined) {
      errors.push(...this.validateType(template.ccImpact, 'string', 'ccImpact'))
    }
    if (template.ccReason !== undefined) {
      errors.push(...this.validateType(template.ccReason, 'string', 'ccReason'))
    }

    // Validate class
    if (template.class !== documents.mixin.DocumentTemplate) {
      errors.push('invalid class: ' + template.class)
    }

    // Validate state values
    if (template.state !== DocumentState.Draft) {
      errors.push('invalid state: ' + template.state)
    }

    // todo: validate seqNumber no duplicated
    return errors
  }

  private validateControlledDocumentSpaces (): void {
    // Validate document spaces
    for (const [spacePath] of this.qmsSpaces) {
      // Validate controlled documents
      const docs = this.qmsDocsBySpace.get(spacePath)
      if (docs !== undefined) {
        // for (const [docPath, doc] of docs) {
        for (const docPath of docs.keys()) {
          // Check parent document exists
          const parentPath = this.documentParents.get(docPath)
          if (parentPath !== undefined && !docs.has(parentPath)) {
            this.addError(docPath, `Parent document not found: ${parentPath}`)
          }
        }
      }
    }
  }
}
