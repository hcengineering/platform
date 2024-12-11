//
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
import core, {
  type Class,
  type Doc,
  type DocumentQuery,
  type Hierarchy,
  type Ref,
  type Tx,
  type TxOperations,
  type Space,
  type Markup,
  type Client,
  type WithLookup,
  SortingOrder,
  checkPermission
} from '@hcengineering/core'
import { type IntlString, translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { type Person, type Employee, getCurrentEmployee } from '@hcengineering/contact'
import request, { RequestStatus } from '@hcengineering/request'
import { isEmptyMarkup } from '@hcengineering/text'
import { showPopup, getUserTimezone, type Location } from '@hcengineering/ui'
import { type KeyFilter } from '@hcengineering/view'
import chunter from '@hcengineering/chunter'
import documents, {
  type ControlledDocument,
  type Document,
  type DocumentRequest,
  type DocumentTemplate,
  type DocumentSpace,
  type DocumentCategory,
  type DocumentMeta,
  type DocumentComment,
  type OrgSpace,
  type Project,
  type ProjectDocument,
  type ProjectMeta,
  ControlledDocumentState,
  DocumentState,
  getDocumentName,
  getDocumentId
} from '@hcengineering/controlled-documents'
import { type Request } from '@hcengineering/request'

import documentsResources from './plugin'
import { getProjectDocumentLink } from './navigation'
import { wizardOpened } from './stores/wizards/create-document'

export type TranslatedDocumentStates = Readonly<Record<DocumentState, string>>

export const isDocumentCommentAttachedTo = (
  value: DocumentComment | null | undefined,
  location: { nodeId?: string | null }
): boolean => {
  if (value === null || value === undefined) {
    return false
  }

  if (value.nodeId === location.nodeId) {
    return true
  }

  return (value.nodeId ?? null) === (location.nodeId ?? null)
}

export async function getTranslatedDocumentStates (lang: string): Promise<TranslatedDocumentStates> {
  return {
    [DocumentState.Draft]: await translate(documents.string.Draft, {}, lang),
    [DocumentState.Deleted]: await translate(documents.string.Deleted, {}, lang),
    [DocumentState.Effective]: await translate(documents.string.Effective, {}, lang),
    [DocumentState.Archived]: await translate(documents.string.Archived, {}, lang)
  }
}

export type TranslatedControlledDocStates = Readonly<Record<ControlledDocumentState, string>>

export async function getTranslatedControlledDocStates (lang: string): Promise<TranslatedControlledDocStates> {
  return {
    [ControlledDocumentState.Approved]: await translate(documentsResources.controlledDocStates.Approved, {}, lang),
    [ControlledDocumentState.InApproval]: await translate(documentsResources.controlledDocStates.InApproval, {}, lang),
    [ControlledDocumentState.InReview]: await translate(documentsResources.controlledDocStates.InReview, {}, lang),
    [ControlledDocumentState.Reviewed]: await translate(documentsResources.controlledDocStates.Reviewed, {}, lang),
    [ControlledDocumentState.Rejected]: await translate(documentsResources.controlledDocStates.Rejected, {}, lang),
    [ControlledDocumentState.ToReview]: await translate(documentsResources.controlledDocStates.ToReview, {}, lang)
  }
}

export function notEmpty<T> (id: T | undefined | null): id is T {
  return id !== undefined && id !== null && id !== ''
}

export function isSpace (hierarchy: Hierarchy, doc: Doc): doc is DocumentSpace {
  return hierarchy.isDerived(doc._class, documents.class.DocumentSpace)
}

export function isDocument (hierarchy: Hierarchy, doc: Doc): doc is Document {
  return hierarchy.isDerived(doc._class, documents.class.Document)
}

export function isDocumentTemplate (hierarchy: Hierarchy, doc: Doc): doc is DocumentTemplate {
  return hierarchy.isDerived(doc._class, documents.mixin.DocumentTemplate)
}

export function isProjectDocument (hierarchy: Hierarchy, doc: Doc): doc is ProjectDocument {
  return hierarchy.isDerived(doc._class, documents.class.ProjectDocument)
}

export async function getVisibleFilters (filters: KeyFilter[], space?: Ref<Space>): Promise<KeyFilter[]> {
  // Removes the "Space" filter if a specific space is provided
  return space === undefined ? filters : filters.filter((f) => f.key !== 'space')
}

export async function sortDocumentStates (_: TxOperations, states: DocumentState[]): Promise<DocumentState[]> {
  states.sort((state1, state2) => documentStatesOrder.indexOf(state2) - documentStatesOrder.indexOf(state1))
  return states
}

export async function getAllDocumentStates (): Promise<DocumentState[]> {
  return documentStatesOrder
}

export async function getDocumentMetaLinkFragment (document: Doc): Promise<Location> {
  const meta = document._id as Ref<DocumentMeta>
  const client = getClient()
  const docs = await client.findAll(
    documents.class.ControlledDocument,
    { attachedTo: meta },
    {
      sort: {
        major: SortingOrder.Descending,
        minor: SortingOrder.Descending
      }
    }
  )

  let targetDocument: ControlledDocument | undefined
  for (const doc of docs) {
    if (doc.state === DocumentState.Effective) {
      targetDocument = doc
      break
    } else if (doc.state === DocumentState.Deleted && targetDocument === undefined) {
      targetDocument = doc
    } else if (doc.state === DocumentState.Draft) {
      targetDocument = doc
    } else if (doc.state === DocumentState.Archived) {
      break
    }
  }

  if (targetDocument === undefined) {
    throw new Error('Cannot resolve a document for meta ' + meta)
  }

  const projectDoc = await client.findOne(
    documents.class.ProjectDocument,
    { document: targetDocument._id },
    {
      lookup: {
        project: documents.class.Project
      },
      sort: {
        '$lookup.project.createdOn': SortingOrder.Descending
      },
      limit: 1
    }
  )

  const project = projectDoc?.project ?? documents.ids.NoProject

  return getProjectDocumentLink(targetDocument, project)
}

export interface TeamPopupData {
  controlledDoc: ControlledDocument
  requestClass: Ref<Class<DocumentRequest>>
}

export async function sendReviewRequest (
  client: TxOperations,
  controlledDoc: ControlledDocument,
  reviewers: Array<Ref<Employee>>
): Promise<void> {
  const approveTx = client.txFactory.createTxUpdateDoc(controlledDoc._class, controlledDoc.space, controlledDoc._id, {
    controlledState: ControlledDocumentState.Reviewed
  })

  await client.update(controlledDoc, {
    reviewers,
    controlledState: ControlledDocumentState.InReview
  })

  await createRequest(
    client,
    controlledDoc._id,
    controlledDoc._class,
    documents.class.DocumentReviewRequest,
    controlledDoc.space,
    reviewers,
    approveTx,
    undefined,
    true
  )
}

export async function sendApprovalRequest (
  client: TxOperations,
  controlledDoc: ControlledDocument,
  approvers: Array<Ref<Employee>>
): Promise<void> {
  const approveTx = client.txFactory.createTxUpdateDoc(controlledDoc._class, controlledDoc.space, controlledDoc._id, {
    controlledState: ControlledDocumentState.Approved
  })

  const rejectTx = client.txFactory.createTxUpdateDoc(controlledDoc._class, controlledDoc.space, controlledDoc._id, {
    controlledState: ControlledDocumentState.Rejected
  })

  await client.update(controlledDoc, {
    approvers,
    controlledState: ControlledDocumentState.InApproval
  })

  await createRequest(
    client,
    controlledDoc._id,
    controlledDoc._class,
    documents.class.DocumentApprovalRequest,
    controlledDoc.space,
    approvers,
    approveTx,
    rejectTx,
    true
  )
}

async function createRequest<T extends Doc> (
  client: TxOperations,
  attachedTo: Ref<T>,
  attachedToClass: Ref<Class<T>>,
  reqClass: Ref<Class<Request>>,
  space: Ref<DocumentSpace>,
  users: Array<Ref<Person>>,
  approveTx: Tx,
  rejectedTx?: Tx,
  areAllApprovesRequired = true
): Promise<Ref<Request>> {
  return await client.addCollection(reqClass, space, attachedTo, attachedToClass, 'requests', {
    requested: users,
    approved: [],
    tx: approveTx,
    rejectedTx,
    status: RequestStatus.Active,
    requiredApprovesCount: areAllApprovesRequired ? users.length : 1
  })
}

async function getActiveRequest (
  client: TxOperations,
  reqClass: Ref<Class<DocumentRequest>>,
  controlledDoc: ControlledDocument
): Promise<DocumentRequest | undefined> {
  return await client.findOne(
    reqClass,
    {
      attachedTo: controlledDoc._id,
      status: RequestStatus.Active
    },
    { sort: { modifiedOn: SortingOrder.Descending } } // TODO: replace with "createdOn" field as soon as it's fixed on the Platform
  )
}

export async function completeRequest (
  client: TxOperations,
  reqClass: Ref<Class<DocumentRequest>>,
  controlledDoc: ControlledDocument
): Promise<void> {
  const req = await getActiveRequest(client, reqClass, controlledDoc)

  const me = getCurrentEmployee()

  if (req == null || !req.requested.includes(me) || req.approved.includes(me)) {
    return
  }

  await client.update(req, {
    $push: {
      approved: me
    }
  })
}

export async function saveComment (message: Markup | undefined, req: DocumentRequest): Promise<void> {
  if (message === undefined || message === '' || isEmptyMarkup(message)) {
    return
  }
  const client = getClient()
  const id = await client.addCollection(chunter.class.ChatMessage, req.space, req._id, req._class, 'comments', {
    message
  })
  await client.createMixin(id, chunter.class.ChatMessage, req.space, request.mixin.RequestDecisionComment, {})
}

export async function rejectRequest (
  client: TxOperations,
  reqClass: Ref<Class<DocumentRequest>>,
  controlledDoc: ControlledDocument,
  rejectionNote: string
): Promise<void> {
  const req = await getActiveRequest(client, reqClass, controlledDoc)

  if (req == null || req.rejected != null) {
    return
  }

  const me = getCurrentEmployee()

  await saveComment(rejectionNote, req)

  await client.update(req, {
    rejected: me,
    status: RequestStatus.Rejected
  })
}

export type ControlledStatesTags = {
  [K in ControlledDocumentState]: DocumentStateTagType
}

export const controlledStatesTags: ControlledStatesTags = {
  [ControlledDocumentState.InReview]: 'inProgress',
  [ControlledDocumentState.Reviewed]: 'inProgress',
  [ControlledDocumentState.InApproval]: 'inProgress',
  [ControlledDocumentState.Approved]: 'inProgress',
  [ControlledDocumentState.Rejected]: 'rejected',
  [ControlledDocumentState.ToReview]: 'effective'
}

export type StatesTags = {
  [K in DocumentState]: DocumentStateTagType
}

export const statesTags: StatesTags = {
  [DocumentState.Draft]: 'draft',
  [DocumentState.Effective]: 'effective',
  [DocumentState.Archived]: 'obsolete',
  [DocumentState.Deleted]: 'obsolete'
}

export const documentStatesOrder = [
  DocumentState.Draft,
  DocumentState.Effective,
  DocumentState.Archived,
  DocumentState.Deleted
]

export const controlledDocumentStatesOrder = [
  ControlledDocumentState.InReview,
  ControlledDocumentState.Reviewed,
  ControlledDocumentState.InApproval,
  ControlledDocumentState.Approved,
  ControlledDocumentState.Rejected,
  ControlledDocumentState.ToReview
]

export interface LoginInfo {
  email: string
  password: string
}

export const loginIntlFieldNames: Readonly<{ [K in keyof LoginInfo]: IntlString }> = {
  email: documentsResources.string.Email,
  password: documentsResources.string.Password
}

export type DocumentStateTagType = 'effective' | 'inProgress' | 'rejected' | 'draft' | 'obsolete'

export function isDocOwner (ownableDocument: { owner?: Ref<Employee> }): boolean {
  const currentPerson = getCurrentEmployee()

  return ownableDocument.owner === currentPerson
}

export async function canChangeDocumentOwner (doc?: Document | Document[]): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }
  if (Array.isArray(doc)) {
    return false
  }

  const me = getCurrentEmployee()

  if (me === doc.owner) {
    return true
  }

  return await checkPermission(getClient(), documents.permission.UpdateDocumentOwner, doc.space)
}

export async function canCreateChildTemplate (
  doc?: Document | Document[] | DocumentSpace | DocumentSpace[] | ProjectDocument | ProjectDocument[]
): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }
  if (Array.isArray(doc)) {
    return false
  }

  const client = getClient()
  const spaceId: Ref<DocumentSpace> = isSpace(client.getHierarchy(), doc) ? doc._id : doc.space
  const orgSpace = await client.findOne(documents.class.OrgSpace, { _id: spaceId })

  return orgSpace !== undefined && (await checkPermission(client, documents.permission.CreateDocument, spaceId))
}

export async function canCreateChildDocument (
  doc?: Document | Document[] | DocumentSpace | DocumentSpace[] | ProjectDocument | ProjectDocument[],
  includeProjects = false
): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }
  if (Array.isArray(doc)) {
    return false
  }

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const spaceId: Ref<DocumentSpace> = isSpace(hierarchy, doc) ? doc._id : doc.space

  const canCreateDocument = await checkPermission(client, documents.permission.CreateDocument, spaceId)
  if (!canCreateDocument) {
    return false
  }

  if (isSpace(hierarchy, doc)) {
    const spaceType = await client.findOne(documents.class.DocumentSpaceType, { _id: doc.type })
    return includeProjects || spaceType?.projects !== true
  }

  if (isProjectDocument(hierarchy, doc)) {
    return await isEditableProject(doc.project)
  }

  return true
}

export async function canDeleteDocumentCategory (doc?: Doc | Doc[]): Promise<boolean> {
  if (doc === null || doc === undefined) {
    return false
  }
  if (Array.isArray(doc)) {
    return false
  }

  const client = getClient()
  const attachedItem = await client.findOne(documents.class.Document, {
    category: doc._id as Ref<DocumentCategory>
  })

  if (attachedItem !== undefined) {
    return false
  }

  return await checkPermission(client, documents.permission.DeleteDocumentCategory, (doc as DocumentCategory).space)
}

function getCurrentProjectId (space: Ref<DocumentSpace>): string {
  return `${space}_###_project`
}

export function getCurrentProject (space: Ref<DocumentSpace>): Ref<Project> | undefined {
  return localStorage.getItem(getCurrentProjectId(space)) as Ref<Project>
}

export function setCurrentProject (space: Ref<DocumentSpace>, project: Ref<Project> | undefined): void {
  if (project !== undefined) {
    localStorage.setItem(getCurrentProjectId(space), project)
  } else {
    localStorage.removeItem(getCurrentProjectId(space))
  }
}

async function getLatestProject (space: Ref<DocumentSpace>, includeReadonly = false): Promise<Project | undefined> {
  const client = getClient()

  // TODO we should use better approach on selecting the latest available project
  // consider assigning sequential numbers to projects
  const query: DocumentQuery<Project> = includeReadonly ? { space } : { space, readonly: false }
  return await client.findOne(documents.class.Project, query, {
    limit: 1,
    sort: { createdOn: SortingOrder.Descending }
  })
}

export async function getLatestProjectId (
  spaceRef: Ref<DocumentSpace>,
  includeReadonly = false
): Promise<Ref<Project> | undefined> {
  const client = getClient()
  const space = await client.findOne(
    documents.class.DocumentSpace,
    {
      _id: spaceRef
    },
    {
      lookup: {
        type: core.class.SpaceType
      }
    }
  )

  if (space !== undefined) {
    if (space.$lookup?.type?.projects ?? false) {
      const project = await getLatestProject(spaceRef, includeReadonly)
      return project?._id
    } else {
      return documents.ids.NoProject
    }
  }
}

export async function isEditableProject (_id: Ref<Project> | undefined): Promise<boolean> {
  if (_id === undefined) {
    return false
  }
  if (_id === documents.ids.NoProject) {
    return true
  }

  const client = getClient()
  const project = await client.findOne(documents.class.Project, { _id })

  return project !== undefined && !project.readonly
}

export function getProjectDocsHierarchy (projectMeta: Array<WithLookup<ProjectMeta>>): {
  rootDocs: Array<WithLookup<ProjectMeta>>
  childrenByParent: Record<Ref<WithLookup<DocumentMeta>>, Array<WithLookup<ProjectMeta>>>
} {
  const rootDocs: Array<WithLookup<ProjectMeta>> = []
  const childrenByParent: Record<Ref<DocumentMeta>, Array<WithLookup<ProjectMeta>>> = {}

  for (const meta of projectMeta) {
    const parentId = meta.path[0] ?? documents.ids.NoParent

    if (childrenByParent[parentId] === undefined) {
      childrenByParent[parentId] = []
    }

    childrenByParent[parentId].push(meta)

    if (parentId === documents.ids.NoParent) {
      rootDocs.push(meta)
    }
  }

  return { rootDocs, childrenByParent }
}

export function compareDocs (doc1: Document, doc2: Document): number {
  return getDocumentName(doc1).localeCompare(getDocumentName(doc2), undefined, { numeric: true })
}

export async function documentIdentifierProvider (client: Client, ref: Ref<Document>, doc?: Document): Promise<string> {
  const document = doc ?? (await client.findOne(documents.class.Document, { _id: ref }))

  if (document === undefined) {
    return ''
  }

  return getDocumentId(document)
}

export function documentCompareFn (doc1: Document, doc2: Document): number {
  return doc1.major - doc2.major !== 0 ? doc1.major - doc2.major : doc1.minor - doc2.minor
}

export function getDocumentVersionString (doc: Document): string {
  return `v${doc.major}.${doc.minor}`
}

export async function getControlledDocumentTitle (
  client: Client,
  ref: Ref<ControlledDocument>,
  doc?: ControlledDocument
): Promise<string> {
  const object = doc ?? (await client.findOne(documents.class.ControlledDocument, { _id: ref }))

  if (object === undefined) return ''

  return object.title
}

export async function createChildDocument (doc: ProjectDocument): Promise<void> {
  wizardOpened({ $$currentStep: 'template', location: { space: doc.space, project: doc.project, parent: doc._id } })
  showPopup(documents.component.QmsDocumentWizard, {})
}

export async function createChildTemplate (doc: ProjectDocument): Promise<void> {
  wizardOpened({ $$currentStep: 'info', location: { space: doc.space, project: doc.project, parent: doc._id } })
  showPopup(documents.component.QmsTemplateWizard, {})
}

export async function createDocument (space: DocumentSpace): Promise<void> {
  const project = await getLatestProjectId(space._id)
  wizardOpened({
    $$currentStep: 'template',
    location: { space: space._id, project: project ?? documents.ids.NoProject }
  })
  showPopup(documents.component.QmsDocumentWizard, {})
}

export async function createTemplate (space: OrgSpace): Promise<void> {
  const project = await getLatestProjectId(space._id)
  wizardOpened({ $$currentStep: 'info', location: { space: space._id, project: project ?? documents.ids.NoProject } })
  showPopup(documents.component.QmsTemplateWizard, {})
}

export function formatSignatureDate (date: number): string {
  const timeZone: string = getUserTimezone()

  return new Date(date).toLocaleDateString('default', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone,
    timeZoneName: 'short',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric'
  })
}
