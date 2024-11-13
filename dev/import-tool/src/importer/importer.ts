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
import attachment, { type Attachment } from '@hcengineering/attachment'
import chunter, { type ChatMessage } from '@hcengineering/chunter'
import { yDocToBuffer } from '@hcengineering/collaboration'
import contact, { type Person } from '@hcengineering/contact'
import core, {
  type Account,
  type AttachedData,
  type Class,
  type CollaborativeDoc,
  type Data,
  type Doc,
  type DocumentQuery,
  generateId,
  makeCollaborativeDoc,
  type Mixin,
  type Ref,
  type Space,
  SortingOrder,
  type Status,
  type Timestamp,
  type TxOperations
} from '@hcengineering/core'
import document, { type Document, getFirstRank, type Teamspace } from '@hcengineering/document'
import task, {
  createProjectType,
  makeRank,
  type ProjectType,
  type TaskType,
  type TaskTypeWithFactory
} from '@hcengineering/task'
import { jsonToMarkup, jsonToYDocNoSchema, type MarkupNode, parseMessageMarkdown } from '@hcengineering/text'
import tracker, {
  type Issue,
  type IssueParentInfo,
  IssuePriority,
  type IssueStatus,
  type Project,
  TimeReportDayType
} from '@hcengineering/tracker'
import { type FileUploader, type UploadResult } from './uploader'

export interface ImportWorkspace {
  projectTypes?: ImportProjectType[]
  spaces?: ImportSpace<ImportDoc>[]
  attachments?: ImportAttachment[]
}

export interface ImportContact {
  name: string
  email: string
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
  class: string
  title: string
  private: boolean
  autoJoin: boolean
  description?: string
  owners?: ImportContact[]
  members?: ImportContact[]
  docs: T[]
}
export interface ImportDoc {
  id?: Ref<Doc>
  class: string
  title: string
  descrProvider: () => Promise<string>
  subdocs: ImportDoc[]
}

export interface ImportTeamspace extends ImportSpace<ImportDocument> {
  class: 'document.class.TeamSpace'
}

export interface ImportDocument extends ImportDoc {
  class: 'document:class:Document'
  id?: Ref<Document>
  subdocs: ImportDocument[]
}

export interface ImportProject extends ImportSpace<ImportIssue> {
  class: 'tracker.class.Project'
  identifier: string
  projectType?: ImportProjectType
  defaultAssignee?: ImportContact
  defaultIssueStatus?: ImportStatus
  description?: string
}

export interface ImportIssue extends ImportDoc {
  class: 'tracker.class.Issue' // todo: doesn't have meaning here, move to huly.ts
  id?: Ref<Issue>
  status: ImportStatus
  number: number
  assignee?: Ref<Person>
  estimation?: number
  remainingTime?: number
  comments?: ImportComment[]
}

export interface ImportComment {
  text: string
  author?: Ref<Account>
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
}

export interface MarkdownPreprocessor {
  process: (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>) => MarkupNode
}

class NoopMarkdownPreprocessor implements MarkdownPreprocessor {
  process (json: MarkupNode, id: Ref<Doc>, spaceId: Ref<Space>): MarkupNode {
    return json
  }
}

export class WorkspaceImporter {
  private readonly issueStatusByName = new Map<string, Ref<IssueStatus>>()
  private readonly projectTypeByName = new Map<string, Ref<ProjectType>>()

  constructor (
    private readonly client: TxOperations,
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
      if (space.class === 'document.class.TeamSpace') {
        await this.importTeamspace(space as ImportTeamspace)
      } else if (space.class === 'tracker.class.Project') {
        await this.importProject(space as ImportProject)
      }
    }
  }

  private async importAttachments (): Promise<void> {
    if (this.workspaceData.attachments === undefined) return

    for (const attachment of this.workspaceData.attachments) {
      if (attachment.parentId === undefined || attachment.parentClass === undefined || attachment.spaceId === undefined) {
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
          statusCategories: [task.statusCategory.Active],
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
    const teamspaceId = await this.createTeamspace(space)
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
    const documentId = await this.createDocument(doc, parentId, teamspaceId)
    for (const child of doc.subdocs) {
      await this.createDocumentWithSubdocs(child, documentId, teamspaceId)
    }
    return documentId
  }

  async createTeamspace (space: ImportTeamspace): Promise<Ref<Teamspace>> {
    const teamspaceId = generateId<Teamspace>()
    const data = {
      type: document.spaceType.DefaultTeamspaceType,
      description: space.description ?? '',
      title: space.title,
      name: space.title,
      private: space.private,
      owners: await this.findAccountsIfAny(space.owners),
      members: await this.findAccountsIfAny(space.members),
      autoJoin: space.autoJoin,
      archived: false
    }
    await this.client.createDoc(document.class.Teamspace, core.space.Space, data, teamspaceId)
    return teamspaceId
  }

  private async findAccountsIfAny (contacts?: ImportContact[]): Promise<Ref<Account>[]> {
    if (contacts === undefined || contacts.length === 0) {
      return []
    }
    const emails = contacts.map((contact) => contact.email)
    const accounts = await this.client.findAll(contact.class.PersonAccount, { email: { $in: emails } })
    return accounts.map((account: Account) => account._id)
  }

  async createDocument (
    doc: ImportDocument,
    parentId: Ref<Document>,
    teamspaceId: Ref<Teamspace>
  ): Promise<Ref<Document>> {
    const id = doc.id ?? generateId<Document>()
    const content = await doc.descrProvider()
    const collabId = await this.createCollaborativeContent(id, 'content', content, teamspaceId)

    const lastRank = await getFirstRank(this.client, teamspaceId, parentId)
    const rank = makeRank(lastRank, undefined)

    const attachedData: Data<Document> = {
      title: doc.title,
      content: collabId,
      parent: parentId,
      attachments: 0,
      embeddings: 0,
      labels: 0,
      comments: 0,
      references: 0,
      rank
    }

    await this.client.createDoc(document.class.Document, teamspaceId, attachedData, id)
    return id
  }

  async importProject (project: ImportProject): Promise<Ref<Project>> {
    console.log('Create project: ', project.title)
    const projectId = await this.createProject(project)
    console.log('Project created: ' + projectId)

    const projectDoc = await this.client.findOne(tracker.class.Project, { _id: projectId })
    if (projectDoc === undefined) {
      throw new Error('Project not found: ' + projectId)
    }

    for (const issue of project.docs) {
      await this.createIssueWithSubissues(issue, tracker.ids.NoParent, projectDoc, [])
    }
    return projectId
  }

  async createIssueWithSubissues (
    issue: ImportIssue,
    parentId: Ref<Issue>,
    project: Project,
    parentsInfo: IssueParentInfo[]
  ): Promise<{ id: Ref<Issue>, identifier: string }> {
    console.log('Creating issue: ', issue.title)
    if (issue.title === undefined) {
      console.log('Issue: ', issue)
    }
    const issueResult = await this.createIssue(issue, project, parentId, parentsInfo)
    console.log('Issue created: ', issueResult)

    if (issue.subdocs.length > 0) {
      const parentsInfoEx = [
        {
          parentId: issueResult.id,
          parentTitle: issue.title,
          space: project._id,
          identifier: issueResult.identifier
        },
        ...parentsInfo
      ]

      for (const child of issue.subdocs) {
        await this.createIssueWithSubissues(child as ImportIssue, issueResult.id, project, parentsInfoEx)
      }
    }

    return issueResult
  }

  async createProject (project: ImportProject): Promise<Ref<Project>> {
    const projectId = generateId<Project>()

    const projectType = project.projectType !== undefined
      ? this.projectTypeByName.get(project.projectType.name)
      : tracker.ids.ClassingProjectType

    const defaultIssueStatus =
      project.defaultIssueStatus !== undefined
        ? this.issueStatusByName.get(project.defaultIssueStatus.name)
        : tracker.status.Backlog

    const identifier = await this.uniqueProjectIdentifier(project.identifier)
    const members = await this.findAccountsIfAny(project.members)
    const owners = await this.findAccountsIfAny(project.owners)
    const projectData = {
      name: project.title,
      description: project.description ?? '',
      private: project.private,
      members,
      owners,
      archived: false,
      autoJoin: project.autoJoin,
      identifier,
      sequence: 0,
      defaultIssueStatus: defaultIssueStatus ?? tracker.status.Backlog, // todo: test with no status
      defaultTimeReportDay: TimeReportDayType.PreviousWorkDay,
      type: projectType as Ref<ProjectType>
    }
    await this.client.createDoc(tracker.class.Project, core.space.Space, projectData, projectId)

    const mixinId = `${projectType}:type:mixin` as Ref<Mixin<Project>>
    await this.client.createMixin(projectId, tracker.class.Project, core.space.Space, mixinId, {})

    return projectId
  }

  async createIssue (
    issue: ImportIssue,
    project: Project,
    parentId: Ref<Issue>,
    parentsInfo: IssueParentInfo[]
  ): Promise<{ id: Ref<Issue>, identifier: string }> {
    const issueId = issue.id ?? generateId<Issue>()
    const content = await issue.descrProvider()
    const collabId = await this.createCollaborativeContent(issueId, 'description', content, project._id)

    const { number, identifier } = await this.getNextIssueIdentifier(project)
    const kind = await this.getIssueKind(project)
    const rank = await this.getIssueRank(project)
    const status = await this.findIssueStatusByName(issue.status.name)

    const estimation = issue.estimation ?? 0
    const remainingTime = issue.remainingTime ?? 0
    const reportedTime = estimation - remainingTime

    const issueData: AttachedData<Issue> = {
      title: issue.title,
      description: collabId,
      assignee: issue.assignee ?? null,
      component: null,
      number,
      status,
      priority: IssuePriority.NoPriority,
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
      project._id,
      parentId,
      tracker.class.Issue,
      'subIssues',
      issueData,
      issueId
    )

    if (issue.comments !== undefined) {
      await this.importComments(issueId, issue.comments, project._id)
    }
    return { id: issueId, identifier }
  }

  private async getNextIssueIdentifier (project: Project): Promise<{ number: number, identifier: string }> {
    const incResult = await this.client.updateDoc(
      tracker.class.Project,
      core.space.Space,
      project._id,
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
      throw new Error(`Task type not found for project: ${project._id}`)
    }
    return kind
  }

  private async getIssueRank (project: Project): Promise<string> {
    const lastIssue = await this.client.findOne<Issue>(
      tracker.class.Issue,
      { space: project._id },
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
      console.warn('Failed to read attachment file: ', attachment.title)
      return
    }

    const file = new File([blob], attachment.title)
    const attachmentId = await this.createAttachment(attachment.id ?? generateId<Attachment>(), file, spaceId, parentId, parentClass)
    if (attachmentId === null) {
      console.warn('Failed to upload attachment file: ', attachment.title)
    }
  }

  private async createAttachment (
    id: Ref<Attachment>,
    file: File,
    spaceId: Ref<Space>,
    parentId: Ref<Doc>,
    parentClass: Ref<Class<Doc<Space>>>
  ): Promise<Ref<Attachment> | null> {
    const response = await this.fileUploader.uploadFile(id, id, file)
    if (response.status !== 200) {
      return null
    }

    const responseText = await response.text()
    if (responseText === undefined) {
      return null
    }

    const uploadResult = JSON.parse(responseText) as UploadResult[]
    if (!Array.isArray(uploadResult) || uploadResult.length === 0) {
      return null
    }

    await this.client.addCollection(
      attachment.class.Attachment,
      spaceId,
      parentId,
      parentClass,
      'attachments',
      {
        file: uploadResult[0].id,
        lastModified: Date.now(),
        name: file.name,
        size: file.size,
        type: file.type
      },
      id
    )
    return id
  }

  // Collaborative content handling
  private async createCollaborativeContent (id: Ref<Doc>, field: string, content: string, spaceId: Ref<Space>): Promise<CollaborativeDoc> {
    const json = parseMessageMarkdown(content ?? '', 'image://')
    const processedJson = this.preprocessor.process(json, id, spaceId)
    const collabId = makeCollaborativeDoc(id, 'description')

    const yDoc = jsonToYDocNoSchema(processedJson, field)
    const buffer = yDocToBuffer(yDoc)

    await this.fileUploader.uploadCollaborativeDoc(id, collabId, buffer)
    return collabId
  }

  async findIssueStatusByName (name: string): Promise<Ref<IssueStatus>> {
    const query: DocumentQuery<Status> = {
      name,
      ofAttribute: tracker.attribute.IssueStatus,
      category: task.statusCategory.Active
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
}
