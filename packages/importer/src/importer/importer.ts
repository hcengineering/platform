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
import attachment, { Drawing, type Attachment } from '@hcengineering/attachment'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import { Employee, type Person } from '@hcengineering/contact'
import documents, {
  ChangeControl,
  type ControlledDocument,
  createControlledDocMetadata,
  createDocumentTemplateMetadata,
  DocumentCategory,
  DocumentMeta,
  type DocumentSpace,
  DocumentState,
  DocumentTemplate,
  OrgSpace,
  ProjectDocument,
  useDocumentTemplate
} from '@hcengineering/controlled-documents'
import core, {
  type AttachedData,
  type Class,
  type CollaborativeDoc,
  type Data,
  type Doc,
  type DocumentQuery,
  generateId,
  makeCollabId,
  type Mixin,
  type Blob as PlatformBlob,
  type Ref,
  RolesAssignment,
  SortingOrder,
  type Space,
  type Status,
  type Timestamp,
  type TxOperations,
  type PersonId,
  type AccountUuid
} from '@hcengineering/core'
import document, { type Document, getFirstRank, type Teamspace } from '@hcengineering/document'
import task, {
  createProjectType,
  makeRank,
  type ProjectType,
  type TaskType,
  type TaskTypeWithFactory
} from '@hcengineering/task'
import { jsonToMarkup, parseMessageMarkdown } from '@hcengineering/text'
import tracker, {
  type Issue,
  type IssueParentInfo,
  IssuePriority,
  type IssueStatus,
  type Project,
  TimeReportDayType
} from '@hcengineering/tracker'
import view from '@hcengineering/view'
import { type MarkdownPreprocessor, NoopMarkdownPreprocessor } from './preprocessor'
import { type FileUploader } from './uploader'
import { Logger } from './logger'

export interface ImportWorkspace {
  projectTypes?: ImportProjectType[]
  spaces?: ImportSpace<ImportDoc>[]
  attachments?: ImportAttachment[]
}

export interface ImportProjectType {
  name: string
  taskTypes?: ImportTaskType[]
  description?: string
}

export interface ImportTaskType {
  name: string
  statuses: ImportStatus[]
  description?: string
}

export interface ImportStatus {
  name: string
  description?: string
}

export interface ImportSpace<T extends ImportDoc> {
  class: Ref<Class<Space>>
  title: string
  private: boolean
  autoJoin?: boolean
  archived?: boolean
  description?: string
  emoji?: string
  owners?: AccountUuid[]
  members?: AccountUuid[]
  docs: T[]
}
export interface ImportDoc {
  id?: Ref<Doc>
  class: Ref<Class<Doc<Space>>>
  title: string
  descrProvider: () => Promise<string>
  subdocs: ImportDoc[]
}

export interface ImportTeamspace extends ImportSpace<ImportDocument> {
  class: Ref<Class<Teamspace>>
}

export interface ImportDocument extends ImportDoc {
  id?: Ref<Document>
  class: Ref<Class<Document>>
  subdocs: ImportDocument[]
}

export interface ImportProject extends ImportSpace<ImportIssue> {
  class: Ref<Class<Project>>
  id?: Ref<Project>
  identifier: string
  projectType?: ImportProjectType
  defaultIssueStatus?: ImportStatus
  description?: string
}

export interface ImportIssue extends ImportDoc {
  id?: Ref<Issue>
  class: Ref<Class<Issue>>
  status: ImportStatus
  priority?: string
  number?: number
  assignee?: Ref<Person>
  estimation?: number
  remainingTime?: number
  comments?: ImportComment[]
}

export interface ImportComment {
  text: string
  author?: PersonId
  date?: Timestamp
  attachments?: ImportAttachment[]
}

export interface ImportAttachment {
  id?: Ref<Attachment>
  title: string
  blobProvider: () => Promise<Blob | null>
  parentId?: Ref<Doc>
  parentClass?: Ref<Class<Doc<Space>>>
  spaceId?: Ref<Space>
  metadata?: ImportImageMetadata
  drawings?: ImportDrawing[]
}

export interface ImportImageMetadata {
  originalWidth: number
  originalHeight: number
}

export interface ImportDrawing {
  contentProvider: () => Promise<string>
}

export type ImportControlledDoc = ImportControlledDocument | ImportControlledDocumentTemplate // todo: rename
export interface ImportOrgSpace extends ImportSpace<ImportControlledDoc> {
  class: Ref<Class<DocumentSpace>>
  qualified?: AccountUuid
  manager?: AccountUuid
  qara?: AccountUuid
}

export interface ImportControlledDocumentTemplate extends ImportDoc {
  id: Ref<ControlledDocument>
  metaId: Ref<DocumentMeta>
  class: Ref<Class<Document>>
  docPrefix: string
  code?: string
  major: number
  minor: number
  state: DocumentState
  category?: Ref<DocumentCategory>
  author?: Ref<Employee>
  owner?: Ref<Employee>
  abstract?: string
  reviewers?: Ref<Employee>[]
  approvers?: Ref<Employee>[]
  coAuthors?: Ref<Employee>[]
  ccReason?: string
  ccImpact?: string
  ccDescription?: string
  subdocs: ImportControlledDoc[]
}

export interface ImportControlledDocument extends ImportDoc {
  id: Ref<ControlledDocument>
  metaId: Ref<DocumentMeta>
  class: Ref<Class<ControlledDocument>>
  template: Ref<ControlledDocument> // todo: test (it was Ref<DocumentTemplate>)
  code?: string
  major: number
  minor: number
  state: DocumentState
  reviewers?: Ref<Employee>[]
  approvers?: Ref<Employee>[]
  coAuthors?: Ref<Employee>[]
  author?: Ref<Employee>
  owner?: Ref<Employee>
  abstract?: string
  ccReason?: string
  ccImpact?: string
  ccDescription?: string
  subdocs: ImportControlledDoc[]
}

export class WorkspaceImporter {
  private readonly issueStatusByName = new Map<string, Ref<IssueStatus>>()
  private readonly projectTypeByName = new Map<string, Ref<ProjectType>>()

  constructor (
    private readonly client: TxOperations,
    private readonly logger: Logger,
    private readonly fileUploader: FileUploader,
    private readonly workspaceData: ImportWorkspace,
    private readonly preprocessor: MarkdownPreprocessor = new NoopMarkdownPreprocessor()
  ) {}

  public async performImport (): Promise<void> {
    await this.importProjectTypes()
    await this.importSpaces()
    await this.importAttachments()
  }

  private async importProjectTypes (): Promise<void> {
    if (this.workspaceData.projectTypes === undefined) return

    for (const projectType of this.workspaceData.projectTypes) {
      const projectTypeId = await this.createProjectTypeWithTaskTypes(projectType)
      this.projectTypeByName.set(projectType.name, projectTypeId)
    }
  }

  private async importSpaces (): Promise<void> {
    if (this.workspaceData.spaces === undefined) return

    for (const space of this.workspaceData.spaces) {
      if (space.class === document.class.Teamspace) {
        await this.importTeamspace(space as ImportTeamspace)
      } else if (space.class === tracker.class.Project) {
        await this.importProject(space as ImportProject)
      } else if (space.class === documents.class.OrgSpace) {
        await this.importOrgSpace(space as ImportOrgSpace)
      }
    }
  }

  private async importAttachments (): Promise<void> {
    if (this.workspaceData.attachments === undefined) return

    for (const attachment of this.workspaceData.attachments) {
      if (
        attachment.parentId === undefined ||
        attachment.parentClass === undefined ||
        attachment.spaceId === undefined
      ) {
        throw new Error('Attachment is missing parentId, parentClass or spaceId')
      }
      await this.importAttachment(attachment.parentId, attachment.parentClass, attachment, attachment.spaceId)
    }
  }

  async createProjectTypeWithTaskTypes (projectType: ImportProjectType): Promise<Ref<ProjectType>> {
    const taskTypes: TaskTypeWithFactory[] = []
    if (projectType.taskTypes !== undefined) {
      for (const taskType of projectType.taskTypes) {
        const taskTypeId = generateId<TaskType>()
        const statuses = taskType.statuses.map((status) => {
          return {
            name: status.name,
            ofAttribute: tracker.attribute.IssueStatus,
            category: task.statusCategory.Active
          }
        })
        taskTypes.push({
          _id: taskTypeId,
          descriptor: tracker.descriptors.Issue,
          kind: 'both',
          name: taskType.name,
          ofClass: tracker.class.Issue,
          statusCategories: [
            task.statusCategory.UnStarted,
            task.statusCategory.ToDo,
            task.statusCategory.Active,
            task.statusCategory.Won,
            task.statusCategory.Lost
          ],
          statusClass: tracker.class.IssueStatus,
          icon: tracker.icon.Issue,
          color: 0,
          allowedAsChildOf: [taskTypeId],
          factory: statuses
        })
      }
    }
    const projectData = {
      name: projectType.name,
      descriptor: tracker.descriptors.ProjectType,
      shortDescription: projectType.description,
      description: '', // put the description as shortDescription, so the users can see it
      tasks: [],
      roles: 0,
      classic: true
    }
    return await createProjectType(this.client, projectData, taskTypes, generateId())
  }

  async importTeamspace (space: ImportTeamspace): Promise<Ref<Teamspace>> {
    this.logger.log('Creating teamspace: ' + space.title)
    const teamspaceId = await this.createTeamspace(space)
    this.logger.log('Teamspace created: ' + teamspaceId)
    for (const doc of space.docs) {
      await this.createDocumentWithSubdocs(doc, document.ids.NoParent, teamspaceId)
    }
    return teamspaceId
  }

  async createDocumentWithSubdocs (
    doc: ImportDocument,
    parentId: Ref<Document>,
    teamspaceId: Ref<Teamspace>
  ): Promise<Ref<Document>> {
    this.logger.log('Creating document: ' + doc.title)
    const documentId = await this.createDocument(doc, parentId, teamspaceId)
    this.logger.log('Document created: ' + documentId)
    for (const child of doc.subdocs) {
      await this.createDocumentWithSubdocs(child, documentId, teamspaceId)
    }
    return documentId
  }

  async createTeamspace (space: ImportTeamspace): Promise<Ref<Teamspace>> {
    const teamspaceId = generateId<Teamspace>()
    const codePoint = space.emoji?.codePointAt(0)
    const data = {
      type: document.spaceType.DefaultTeamspaceType,
      description: space.description ?? '',
      title: space.title,
      name: space.title,
      private: space.private,
      color: codePoint,
      icon: codePoint === undefined ? undefined : view.ids.IconWithEmoji,
      owners: space.owners ?? [],
      members: space.members ?? [],
      autoJoin: space.autoJoin,
      archived: space.archived ?? false
    }
    await this.client.createDoc(document.class.Teamspace, core.space.Space, data, teamspaceId)
    return teamspaceId
  }

  async createDocument (
    doc: ImportDocument,
    parentId: Ref<Document>,
    teamspaceId: Ref<Teamspace>
  ): Promise<Ref<Document>> {
    const id = doc.id ?? generateId<Document>()
    const content = await doc.descrProvider()
    const collabId = makeCollabId(document.class.Document, id, 'content')
    const contentId = await this.createCollaborativeContent(id, collabId, content, teamspaceId)

    const lastRank = await getFirstRank(this.client, teamspaceId, parentId)
    const rank = makeRank(lastRank, undefined)

    const data: Data<Document> = {
      title: doc.title,
      content: contentId,
      parent: parentId,
      attachments: 0,
      embeddings: 0,
      labels: 0,
      comments: 0,
      references: 0,
      rank
    }

    await this.client.createDoc(document.class.Document, teamspaceId, data, id)
    return id
  }

  async importProject (project: ImportProject): Promise<Ref<Project>> {
    let projectId: Ref<Project>
    if (project.id === tracker.project.DefaultProject) {
      this.logger.log('Setting up default project: ' + project.title)
      projectId = tracker.project.DefaultProject
      await this.updateProject(projectId, project)
      this.logger.log('Default project updated: ' + projectId)
    } else {
      this.logger.log('Creating project: ', project.title)
      projectId = await this.createProject(project)
      this.logger.log('Project created: ' + projectId)
    }

    const projectDoc = await this.client.findOne(tracker.class.Project, { _id: projectId })
    if (projectDoc === undefined) {
      throw new Error('Project not found: ' + projectId)
    }

    for (const issue of project.docs) {
      await this.createIssueWithSubissues(issue, tracker.ids.NoParent, projectDoc, projectId, [])
    }
    return projectId
  }

  async createIssueWithSubissues (
    issue: ImportIssue,
    parentId: Ref<Issue>,
    project: Project,
    spaceId: Ref<Project>,
    parentsInfo: IssueParentInfo[]
  ): Promise<{ id: Ref<Issue>, identifier: string }> {
    this.logger.log('Creating issue: ' + issue.title)
    const issueResult = await this.createIssue(issue, project, parentId, spaceId, parentsInfo)
    this.logger.log('Issue created: ' + JSON.stringify(issueResult))

    if (issue.subdocs.length > 0) {
      const parentsInfoEx = [
        {
          parentId: issueResult.id,
          parentTitle: issue.title,
          space: spaceId,
          identifier: issueResult.identifier
        },
        ...parentsInfo
      ]

      for (const child of issue.subdocs) {
        await this.createIssueWithSubissues(child as ImportIssue, issueResult.id, project, spaceId, parentsInfoEx)
      }
    }

    return issueResult
  }

  async updateProject (projectId: Ref<Project>, project: ImportProject): Promise<Ref<Project>> {
    const oldProject = await this.client.findOne(tracker.class.Project, { _id: projectId })
    if (oldProject === undefined) {
      throw new Error('Project not found: ' + projectId)
    }
    const maxIssueNumber = this.getMaxImportIssueNumber(project)
    const codePoint = project.emoji?.codePointAt(0)
    const projectData = {
      name: project.title,
      private: project.private,
      description: project.description ?? oldProject.description,
      members: project.members ?? oldProject.members,
      owners: project.owners ?? oldProject.owners,
      archived: project.archived ?? oldProject.archived,
      autoJoin: project.autoJoin ?? oldProject.autoJoin,
      identifier:
        project.identifier !== undefined
          ? await this.uniqueProjectIdentifier(project.identifier)
          : oldProject.identifier,
      sequence: Math.max(oldProject.sequence, maxIssueNumber),
      color: codePoint ?? oldProject.color,
      icon: codePoint === undefined ? undefined : view.ids.IconWithEmoji,
      defaultIssueStatus:
        project.defaultIssueStatus !== undefined
          ? this.issueStatusByName.get(project.defaultIssueStatus.name)
          : oldProject.defaultIssueStatus,
      defaultTimeReportDay: oldProject.defaultTimeReportDay,
      type:
        project.projectType !== undefined
          ? this.projectTypeByName.get(project.projectType.name) ?? tracker.ids.ClassingProjectType
          : oldProject.type
    }

    await this.client.updateDoc(tracker.class.Project, core.space.Space, projectId, projectData)
    return projectId
  }

  async createProject (project: ImportProject): Promise<Ref<Project>> {
    const projectId = generateId<Project>()

    const projectType =
      project.projectType !== undefined
        ? this.projectTypeByName.get(project.projectType.name)
        : tracker.ids.ClassingProjectType

    const defaultIssueStatus =
      project.defaultIssueStatus !== undefined
        ? this.issueStatusByName.get(project.defaultIssueStatus.name)
        : tracker.status.Backlog

    const identifier = await this.uniqueProjectIdentifier(project.identifier)
    const codePoint = project.emoji?.codePointAt(0)
    const projectData = {
      name: project.title,
      description: project.description ?? '',
      private: project.private,
      members: project.members ?? [],
      owners: project.owners ?? [],
      archived: false,
      autoJoin: project.autoJoin,
      identifier,
      sequence: this.getMaxImportIssueNumber(project),
      color: codePoint,
      icon: codePoint != null ? view.ids.IconWithEmoji : undefined,
      defaultIssueStatus: defaultIssueStatus ?? tracker.status.Backlog,
      defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
      type: projectType as Ref<ProjectType>
    }
    await this.client.createDoc(tracker.class.Project, core.space.Space, projectData, projectId)

    const mixinId = `${projectType}:type:mixin` as Ref<Mixin<Project>>
    await this.client.createMixin(projectId, tracker.class.Project, core.space.Space, mixinId, {})

    return projectId
  }

  private getMaxImportIssueNumber (project: ImportProject): number {
    const maxIssueNumber = Math.max(...project.docs.map((doc) => doc.number ?? 0))
    return maxIssueNumber
  }

  async createIssue (
    issue: ImportIssue,
    project: Project,
    parentId: Ref<Issue>,
    spaceId: Ref<Project>,
    parentsInfo: IssueParentInfo[]
  ): Promise<{ id: Ref<Issue>, identifier: string }> {
    const issueId = issue.id ?? generateId<Issue>()
    const content = await issue.descrProvider()
    const collabId = makeCollabId(tracker.class.Issue, issueId, 'description')
    const contentId = await this.createCollaborativeContent(issueId, collabId, content, spaceId)

    const { number, identifier } =
      issue.number !== undefined
        ? { number: issue.number, identifier: `${project.identifier}-${issue.number}` }
        : await this.getNextIssueIdentifier(project, spaceId)

    const kind = await this.getIssueKind(project)
    const rank = await this.getIssueRank(project, spaceId)
    const status = await this.findIssueStatusByName(issue.status.name)
    const priority =
      issue.priority !== undefined
        ? IssuePriority[issue.priority as keyof typeof IssuePriority]
        : IssuePriority.NoPriority

    const estimation = issue.estimation ?? 0
    const remainingTime = issue.remainingTime ?? 0
    const reportedTime = estimation - remainingTime

    const issueData: AttachedData<Issue> = {
      title: issue.title,
      description: contentId,
      assignee: issue.assignee ?? null,
      component: null,
      number,
      status,
      priority,
      rank,
      comments: issue.comments?.length ?? 0,
      subIssues: issue.subdocs.length,
      dueDate: null,
      parents: parentsInfo,
      remainingTime,
      estimation,
      reportedTime,
      reports: 0,
      childInfo: [],
      identifier,
      kind: kind._id
    }

    await this.client.addCollection(
      tracker.class.Issue,
      spaceId,
      parentId,
      tracker.class.Issue,
      'subIssues',
      issueData,
      issueId
    )

    if (issue.comments !== undefined) {
      await this.importComments(issueId, issue.comments, spaceId)
    }
    return { id: issueId, identifier }
  }

  private async getNextIssueIdentifier (
    project: Project,
    spaceId: Ref<Project>
  ): Promise<{ number: number, identifier: string }> {
    const incResult = await this.client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      spaceId,
      { $inc: { sequence: 1 } },
      true
    )
    const number = (incResult as any).object.sequence
    const identifier = `${project.identifier}-${number}`
    return { number, identifier }
  }

  private async getIssueKind (project: Project): Promise<TaskType> {
    const taskKind = project?.type !== undefined ? { parent: project.type } : {}
    const kind = await this.client.findOne(task.class.TaskType, taskKind)
    if (kind === undefined) {
      throw new Error(`Task type not found for project: ${project.name}`)
    }
    return kind
  }

  private async getIssueRank (project: Project, spaceId: Ref<Project>): Promise<string> {
    const lastIssue = await this.client.findOne<Issue>(
      tracker.class.Issue,
      { space: spaceId },
      { sort: { rank: SortingOrder.Descending } }
    )
    return makeRank(lastIssue?.rank, undefined)
  }

  private async importComments (issueId: Ref<Issue>, comments: ImportComment[], projectId: Ref<Project>): Promise<void> {
    const sortedComments = comments.sort((a, b) => {
      const now = Date.now()
      return (a.date ?? now) - (b.date ?? now)
    })
    for (const comment of sortedComments) {
      await this.createComment(issueId, comment, projectId)
    }
  }

  async createComment (issueId: Ref<Issue>, comment: ImportComment, projectId: Ref<Project>): Promise<void> {
    const json = parseMessageMarkdown(comment.text ?? '', 'image://')
    const processedJson = this.preprocessor.process(json, issueId, projectId)
    const markup = jsonToMarkup(processedJson)

    const value: AttachedData<ChatMessage> = {
      message: markup,
      attachments: comment.attachments?.length
    }

    const commentId = generateId<ChatMessage>()
    await this.client.addCollection(
      chunter.class.ChatMessage,
      projectId,
      issueId,
      tracker.class.Issue,
      'comments',
      value,
      commentId,
      comment.date,
      comment.author
    )

    if (comment.attachments !== undefined) {
      for (const attachment of comment.attachments) {
        await this.importAttachment(commentId, chunter.class.ChatMessage, attachment, projectId)
      }
    }
  }

  private async importAttachment (
    parentId: Ref<Doc>,
    parentClass: Ref<Class<Doc<Space>>>,
    attachment: ImportAttachment,
    spaceId: Ref<Space>
  ): Promise<void> {
    const blob = await attachment.blobProvider()
    if (blob === null) {
      this.logger.error('Failed to read attachment file: ' + attachment.title)
      return
    }

    const file = new File([blob], attachment.title, { type: blob.type })

    try {
      const blobId = await this.createAttachment(
        attachment.id ?? generateId<Attachment>(),
        spaceId,
        parentId,
        parentClass,
        file,
        attachment.metadata
      )

      if (attachment.drawings !== undefined) {
        for (const drawing of attachment.drawings) {
          await this.createDrawing(blobId, drawing, spaceId)
        }
      }
    } catch {
      this.logger.error('Failed to upload attachment file: ', attachment.title)
    }
  }

  private async createAttachment (
    id: Ref<Attachment>,
    spaceId: Ref<Space>,
    parentId: Ref<Doc>,
    parentClass: Ref<Class<Doc<Space>>>,
    file: File,
    metadata?: ImportImageMetadata
  ): Promise<Ref<PlatformBlob>> {
    const uploadResult = await this.fileUploader.uploadFile(id, file)
    if (!uploadResult.success) {
      throw new Error('Failed to upload attachment file: ' + file.name)
    }
    await this.client.addCollection(
      attachment.class.Attachment,
      spaceId,
      parentId,
      parentClass,
      'attachments',
      {
        file: uploadResult.id,
        lastModified: Date.now(),
        name: file.name,
        size: file.size,
        type: file.type,
        metadata
      },
      id
    )
    return uploadResult.id
  }

  private async createDrawing (
    blobId: Ref<PlatformBlob>,
    drawing: ImportDrawing,
    spaceId: Ref<Space>
  ): Promise<Ref<Drawing>> {
    const id = generateId<Drawing>()
    const data: Data<Drawing> = {
      parent: blobId,
      parentClass: core.class.Blob,
      content: await drawing.contentProvider()
    }
    await this.client.createDoc(attachment.class.Drawing, spaceId, data, id)
    return id
  }

  // Collaborative content handling
  private async createCollaborativeContent (
    id: Ref<Doc>,
    collabId: CollaborativeDoc,
    content: string,
    spaceId: Ref<Space>
  ): Promise<Ref<PlatformBlob>> {
    const json = parseMessageMarkdown(content ?? '', 'image://')
    const processedJson = this.preprocessor.process(json, id, spaceId)

    const markup = jsonToMarkup(processedJson)

    const result = await this.fileUploader.uploadCollaborativeDoc(collabId, markup)
    if (result.success) {
      return result.id
    }
    throw new Error('Failed to upload collaborative document: ' + id)
  }

  async findIssueStatusByName (name: string): Promise<Ref<IssueStatus>> {
    const query: DocumentQuery<Status> = {
      name,
      ofAttribute: tracker.attribute.IssueStatus
    }

    const status = await this.client.findOne(tracker.class.IssueStatus, query)
    if (status === undefined) {
      throw new Error('Issue status not found: ' + name)
    }

    return status._id
  }

  async uniqueProjectIdentifier (baseIdentifier: string): Promise<string> {
    const projects = await this.client.findAll(tracker.class.Project, {})
    const projectsIdentifiers = new Set(projects.map(({ identifier }) => identifier))

    let identifier = baseIdentifier
    let i = 1
    while (projectsIdentifiers.has(identifier)) {
      identifier = `${baseIdentifier}${i}`
      i++
    }
    return identifier
  }

  async importOrgSpace (space: ImportOrgSpace): Promise<Ref<DocumentSpace>> {
    this.logger.log('Creating document space: ' + space.title)
    const spaceId = await this.createOrgSpace(space)
    this.logger.log('Document space created: ' + spaceId)

    // Create hierarchy meta
    const templateMetaMap = new Map<Ref<ControlledDocument>, { seqNumber: number, code: string }>()
    for (const doc of space.docs) {
      if (this.isDocumentTemplate(doc)) {
        await this.createDocTemplateMetaHierarhy(doc as ImportControlledDocumentTemplate, templateMetaMap, spaceId)
      } else {
        await this.createControlledDocMetaHierarhy(doc as ImportControlledDocument, templateMetaMap, spaceId)
      }
    }

    // Partition templates and documents
    const templateMap = new Map<Ref<ControlledDocument>, ImportControlledDocumentTemplate>()
    const documentMap = new Map<Ref<ControlledDocument>, ImportControlledDocument>()
    for (const doc of space.docs) {
      this.partitionTemplatesFromDocuments(doc, documentMap, templateMap)
    }

    // Create attached docs for templates
    for (const template of templateMap.values()) {
      const meta = templateMetaMap.get(template.id)
      if (meta === undefined) {
        throw new Error('Template meta not found: ' + template.id)
      }
      await this.createDocTemplateAttachedDoc(template, meta.seqNumber, meta.code, spaceId)
    }

    // Create attached docs for documents
    for (const document of documentMap.values()) {
      await this.createControlledDocAttachedDoc(document, spaceId)
    }

    return spaceId
  }

  private partitionTemplatesFromDocuments (
    doc: ImportControlledDoc,
    documentMap: Map<Ref<ControlledDocument>, ImportControlledDocument>,
    templateMap: Map<Ref<ControlledDocument>, ImportControlledDocumentTemplate>
  ): void {
    if (this.isDocumentTemplate(doc)) {
      templateMap.set(doc.id, doc as ImportControlledDocumentTemplate)
    } else {
      documentMap.set(doc.id, doc as ImportControlledDocument)
    }

    for (const subdoc of doc.subdocs) {
      this.partitionTemplatesFromDocuments(subdoc, documentMap, templateMap)
    }
  }

  private isDocumentTemplate (doc: ImportDoc): boolean {
    return doc.class === documents.mixin.DocumentTemplate
  }

  private async createOrgSpace (space: ImportOrgSpace): Promise<Ref<DocumentSpace>> {
    const spaceId = generateId<DocumentSpace>()
    const data: Data<OrgSpace> = {
      type: documents.spaceType.DocumentSpaceType,
      description: space.description ?? '',
      name: space.title,
      private: space.private,
      owners: space.owners ?? [],
      members: space.members ?? [],
      archived: space.archived ?? false
    }
    await this.client.createDoc(documents.class.OrgSpace, core.space.Space, data, spaceId)

    const rolesAssignment: RolesAssignment = {}
    if (space.qualified !== undefined) {
      rolesAssignment[documents.role.QualifiedUser] = [space.qualified]
    }
    if (space.manager !== undefined) {
      rolesAssignment[documents.role.Manager] = [space.manager]
    }
    if (space.qara !== undefined) {
      rolesAssignment[documents.role.QARA] = [space.qara]
    }
    if (Object.keys(rolesAssignment).length > 0) {
      await this.client.createMixin(
        spaceId,
        documents.class.OrgSpace,
        core.space.Space,
        documents.mixin.DocumentSpaceTypeData,
        rolesAssignment
      )
    }
    return spaceId
  }

  private async createDocTemplateMetaHierarhy (
    template: ImportControlledDocumentTemplate,
    templateMetaMap: Map<Ref<ControlledDocument>, { seqNumber: number, code: string }>,
    spaceId: Ref<DocumentSpace>,
    parentProjectDocumentId?: Ref<ProjectDocument>
  ): Promise<Ref<ControlledDocument>> {
    this.logger.log('Creating document template: ' + template.title)
    const templateId = template.id ?? generateId<ControlledDocument>()

    const { seqNumber, code, projectDocumentId } = await createDocumentTemplateMetadata(
      this.client,
      documents.class.Document,
      spaceId,
      documents.mixin.DocumentTemplate,
      undefined,
      parentProjectDocumentId,
      templateId as unknown as Ref<ControlledDocument>, // todo: suspisios place
      template.docPrefix,
      template.code ?? '',
      template.title,
      template.metaId
    )

    templateMetaMap.set(templateId, { seqNumber, code })

    for (const subdoc of template.subdocs) {
      if (this.isDocumentTemplate(subdoc)) {
        await this.createDocTemplateMetaHierarhy(
          subdoc as ImportControlledDocumentTemplate,
          templateMetaMap,
          spaceId,
          projectDocumentId
        )
      } else {
        await this.createControlledDocMetaHierarhy(
          subdoc as ImportControlledDocument,
          templateMetaMap,
          spaceId,
          projectDocumentId
        )
      }
    }

    return templateId
  }

  private async createDocTemplateAttachedDoc (
    template: ImportControlledDocumentTemplate,
    seqNumber: number,
    code: string,
    spaceId: Ref<DocumentSpace>
  ): Promise<Ref<ControlledDocument>> {
    const content = await template.descrProvider()

    this.logger.log('Creating document template attached doc: ' + template.title)

    const collabId = makeCollabId(documents.class.Document, template.id, 'content')
    const contentId = await this.createCollaborativeContent(template.id, collabId, content, spaceId)

    const changeControlId =
      template.ccReason !== undefined || template.ccImpact !== undefined || template.ccDescription !== undefined
        ? await this.createChangeControl(spaceId, template.ccDescription, template.ccReason, template.ccImpact)
        : ('' as Ref<ChangeControl>)

    const ops = this.client.apply()
    const result = await ops.addCollection(
      documents.class.ControlledDocument,
      spaceId,
      template.metaId,
      documents.class.DocumentMeta,
      'documents',
      {
        title: template.title,
        major: template.major,
        minor: template.minor,
        state: template.state,
        author: template.author,
        owner: template.owner,
        abstract: template.abstract,
        reviewers: template.reviewers ?? [],
        approvers: template.approvers ?? [],
        coAuthors: template.coAuthors ?? [],
        code,
        seqNumber,
        prefix: template.docPrefix, // todo: or TEMPLATE_PREFIX?s
        content: contentId,
        changeControl: changeControlId,
        commentSequence: 0,
        requests: 0,
        labels: 0
      },
      template.id as unknown as Ref<ControlledDocument> // todo: make sure it's not used anywhere as mixin id
    )

    await ops.createMixin(template.id, documents.class.Document, spaceId, documents.mixin.DocumentTemplate, {
      sequence: 0,
      docPrefix: template.docPrefix
    })

    const commit = await ops.commit()
    if (!commit.result) {
      throw new Error('Failed to create document template attached doc: ' + template.title)
    }

    this.logger.log('Document template attached doc created: ' + result)
    return result
  }

  private async createControlledDocMetaHierarhy (
    doc: ImportControlledDocument,
    templateMetaMap: Map<Ref<ControlledDocument>, { seqNumber: number, code: string }>,
    spaceId: Ref<DocumentSpace>,
    parentProjectDocumentId?: Ref<ProjectDocument>
  ): Promise<Ref<ControlledDocument>> {
    this.logger.log('Creating controlled document: ' + doc.title)
    const documentId = doc.id ?? generateId<ControlledDocument>()

    // const { seqNumber, prefix, category } = await useDocumentTemplate(this.client, doc.template as unknown as Ref<DocumentTemplate>)
    const result = await createControlledDocMetadata(
      this.client,
      documents.template.ProductChangeControl, // todo: make it dynamic - wtf, commit missed?
      documentId,
      spaceId,
      undefined, // project
      parentProjectDocumentId, // parent
      'prefix',
      0,
      doc.code ?? '',
      doc.title,
      doc.metaId
    )

    // Process subdocs recursively
    for (const subdoc of doc.subdocs) {
      if (this.isDocumentTemplate(subdoc)) {
        await this.createDocTemplateMetaHierarhy(
          subdoc as ImportControlledDocumentTemplate,
          templateMetaMap,
          spaceId,
          result.projectDocumentId
        )
      } else {
        await this.createControlledDocMetaHierarhy(
          subdoc as ImportControlledDocument,
          templateMetaMap,
          spaceId,
          result.projectDocumentId
        )
      }
    }

    return documentId
  }

  private async createControlledDocAttachedDoc (
    document: ImportControlledDocument,
    spaceId: Ref<DocumentSpace>
  ): Promise<Ref<ControlledDocument>> {
    this.logger.log('Creating controlled document attached doc: ' + document.title)

    const content = await document.descrProvider()
    const collabId = makeCollabId(documents.class.Document, document.id, 'content')
    const contentId = await this.createCollaborativeContent(document.id, collabId, content, spaceId)

    const templateId = document.template
    const { seqNumber, prefix, category } = await useDocumentTemplate(
      this.client,
      templateId as unknown as Ref<DocumentTemplate>
    )

    const ops = this.client.apply()

    const changeControlId =
      document.ccReason !== undefined || document.ccImpact !== undefined
        ? await this.createChangeControl(spaceId, document.ccDescription, document.ccReason, document.ccImpact)
        : ('' as Ref<ChangeControl>)

    const result = await ops.addCollection(
      documents.class.ControlledDocument,
      spaceId,
      document.metaId,
      documents.class.DocumentMeta,
      'documents',
      {
        title: document.title,
        major: document.major,
        minor: document.minor,
        state: document.state,
        author: document.author,
        owner: document.owner,
        abstract: document.abstract,
        reviewers: document.reviewers ?? [],
        approvers: document.approvers ?? [],
        coAuthors: document.coAuthors ?? [],
        changeControl: changeControlId,
        code: document.code ?? `${prefix}-${seqNumber}`,
        prefix,
        category,
        seqNumber,
        content: contentId,
        template: templateId as unknown as Ref<DocumentTemplate>,
        commentSequence: 0,
        requests: 0
      },
      document.id
    )

    await ops.updateDoc(documents.class.DocumentMeta, spaceId, document.metaId, {
      documents: 0,
      title: `${prefix}-${seqNumber} ${document.title}`
    })

    await ops.commit()

    this.logger.log('Controlled document attached doc created: ' + result)

    return result
  }

  private async createChangeControl (
    spaceId: Ref<DocumentSpace>,
    description?: string,
    reason?: string,
    impact?: string
  ): Promise<Ref<ChangeControl>> {
    const changeControlData: Data<ChangeControl> = {
      reason: reason ?? '',
      impact: impact ?? '',
      description: description ?? '',
      impactedDocuments: []
    }

    return await this.client.createDoc(documents.class.ChangeControl, spaceId, changeControlData)
  }
}
