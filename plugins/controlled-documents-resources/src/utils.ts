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

import chunter from '@hcengineering/chunter'
import { type Employee, type Person, getCurrentEmployee } from '@hcengineering/contact'
import documents, {
  type ControlledDocument,
  type Document,
  type DocumentBundle,
  type DocumentCategory,
  type DocumentComment,
  type DocumentMeta,
  type DocumentRequest,
  type DocumentSpace,
  type DocumentTemplate,
  type OrgSpace,
  type Project,
  type ProjectDocument,
  type ProjectMeta,
  ControlledDocumentState,
  DocumentState,
  ProjectDocumentTree,
  compareDocumentVersions,
  emptyBundle,
  getDocumentName,
  getFirstRank,
  transferDocuments
} from '@hcengineering/controlled-documents'
import core, {
  type Class,
  type Client,
  type Doc,
  type DocumentQuery,
  type Hierarchy,
  type Markup,
  type QuerySelector,
  type Ref,
  type Space,
  type Tx,
  type TxOperations,
  type WithLookup,
  SortingOrder,
  checkPermission
} from '@hcengineering/core'
import { type IntlString, translate } from '@hcengineering/platform'
import { createQuery, getClient, MessageBox } from '@hcengineering/presentation'
import request, { type Request, RequestStatus } from '@hcengineering/request'
import { isEmptyMarkup } from '@hcengineering/text'
import { type Location, getUserTimezone, showPopup } from '@hcengineering/ui'
import { type KeyFilter } from '@hcengineering/view'

import { makeRank } from '@hcengineering/rank'
import { getProjectDocumentLink } from './navigation'
import documentsResources from './plugin'
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
    [DocumentState.Archived]: await translate(documents.string.Archived, {}, lang),
    [DocumentState.Obsolete]: await translate(documents.string.Obsolete, {}, lang)
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

export function isFolder (hierarchy: Hierarchy, doc: Doc): doc is ProjectDocument {
  if (!isProjectDocument(hierarchy, doc)) return false
  return doc.document === documents.ids.Folder
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
    } else if (doc.state === DocumentState.Obsolete && targetDocument === undefined) {
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

export async function getControlledDocumentLinkFragment (document: ControlledDocument): Promise<Location> {
  const client = getClient()
  const targetDocument = await client.findOne(documents.class.ProjectDocument, { document: document._id })

  if (targetDocument === undefined) {
    throw new Error('Cannot resolve a ProjectDocument for document ' + document._id)
  }

  const project = targetDocument.project ?? documents.ids.NoProject
  return getProjectDocumentLink(document, project)
}

export interface TeamPopupData {
  controlledDoc: ControlledDocument
  requestClass: Ref<Class<DocumentRequest>>
  requireSignature?: boolean
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
  [DocumentState.Deleted]: 'obsolete',
  [DocumentState.Obsolete]: 'obsolete'
}

export const documentStatesOrder = [
  DocumentState.Draft,
  DocumentState.Effective,
  DocumentState.Archived,
  DocumentState.Obsolete,
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

export async function canCreateChildFolder (
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

export async function canRenameFolder (
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

  if (!isFolder(hierarchy, doc)) {
    return false
  }

  return await isEditableProject(doc.project)
}

export async function canDeleteFolder (doc: ProjectDocument): Promise<boolean> {
  if (doc?._class === undefined) return false

  const client = getClient()
  const hierarchy = client.getHierarchy()

  if (!isFolder(hierarchy, doc)) {
    return false
  }

  const currentUser = getCurrentAccount() as PersonAccount
  if (doc.createdBy === currentUser._id) {
    return true
  }

  return await checkPermission(getClient(), documents.permission.ArchiveDocument, doc.space)
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

  return document.code
}

export async function getDocumentMetaTitle (
  client: Client,
  ref: Ref<DocumentMeta>,
  doc?: DocumentMeta
): Promise<string> {
  const object = doc ?? (await client.findOne(documents.class.DocumentMeta, { _id: ref }))

  if (object === undefined) return ''

  return object.title
}

export async function controlledDocumentReferenceObjectProvider (
  client: Client,
  ref: Ref<ControlledDocument>,
  doc?: ControlledDocument
): Promise<Doc | undefined> {
  const document = doc ?? (await client.findOne(documents.class.ControlledDocument, { _id: ref }))
  if (document === undefined) return

  const meta = await client.findOne(documents.class.DocumentMeta, { _id: document.attachedTo })
  if (meta === undefined) return

  let documentSeq: ControlledDocument[] = await client.findAll(documents.class.ControlledDocument, {
    attachedTo: meta._id
  })

  const allowStates = [DocumentState.Draft, DocumentState.Effective]
  documentSeq = documentSeq.filter((d) => allowStates.includes(d.state)).sort(compareDocumentVersions)

  const effIndex = documentSeq.findIndex((d) => d.state === DocumentState.Effective)
  const docIndex = documentSeq.findIndex((d) => d._id === document._id)

  return docIndex >= 0 && (docIndex <= effIndex || effIndex < 0) ? meta : document
}

export async function projectDocumentReferenceObjectProvider (
  client: Client,
  ref: Ref<ProjectDocument>,
  doc?: ProjectDocument
): Promise<Doc | undefined> {
  const prjdoc = doc ?? (await client.findOne(documents.class.ProjectDocument, { _id: ref }))
  if (prjdoc === undefined) return

  return await controlledDocumentReferenceObjectProvider(client, prjdoc.document as Ref<ControlledDocument>)
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

  return object.title + ` (${getDocumentVersionString(object)})`
}

export async function createChildDocument (doc: ProjectDocument): Promise<void> {
  wizardOpened({ $$currentStep: 'template', location: { space: doc.space, project: doc.project, parent: doc._id } })
  showPopup(documents.component.QmsDocumentWizard, {})
}

export async function createChildTemplate (doc: ProjectDocument): Promise<void> {
  wizardOpened({ $$currentStep: 'info', location: { space: doc.space, project: doc.project, parent: doc._id } })
  showPopup(documents.component.QmsTemplateWizard, {})
}

export async function createChildFolder (doc: ProjectDocument): Promise<void> {
  const props = {
    space: doc.space,
    project: doc.project,
    parent: doc._id
  }

  showPopup(documents.component.CreateFolder, props)
}

export async function renameFolder (doc: ProjectDocument): Promise<void> {
  const client = getClient()

  const pjmeta = await client.findOne(documents.class.ProjectMeta, { _id: doc.attachedTo })
  if (pjmeta === undefined) return

  const meta = await client.findOne(documents.class.DocumentMeta, { _id: pjmeta.meta })
  if (meta === undefined) return

  const props = {
    folder: meta,
    name: meta.title
  }

  showPopup(documents.component.CreateFolder, props)
}

export async function deleteFolder (obj: ProjectDocument): Promise<void> {
  const success = await _deleteFolder(obj)
  if (!success) {
    showPopup(MessageBox, {
      label: documentsResources.string.CannotDeleteFolder,
      message: documentsResources.string.CannotDeleteFolderHint,
      canSubmit: false
    })
  }
}

async function _deleteFolder (obj: ProjectDocument): Promise<boolean> {
  const client = getClient()

  if (!(await canDeleteFolder(obj))) {
    return false
  }

  const space = obj.space
  const project = obj.project

  const bundle: DocumentBundle = {
    ...emptyBundle(),
    ProjectMeta: await client.findAll(documents.class.ProjectMeta, { space, project }),
    ProjectDocument: await client.findAll(documents.class.ProjectDocument, { space, project }),
    DocumentMeta: await client.findAll(documents.class.DocumentMeta, { space }),
    ControlledDocument: await client.findAll(documents.class.ControlledDocument, { space })
  }

  const prjMeta = bundle.ProjectMeta.find((m) => m._id === obj.attachedTo)
  if (prjMeta === undefined) return false

  const tree = new ProjectDocumentTree(bundle, { keepRemoved: true })

  const movableStates = [DocumentState.Deleted, DocumentState.Obsolete]
  const descendants = tree.descendantsOf(prjMeta.meta)
  for (const meta of descendants) {
    const bundle = tree.bundleOf(meta)
    const docs = bundle?.ControlledDocument ?? []
    const movable = docs.every((d) => movableStates.includes(d.state))
    if (!movable) return false
  }

  const children = tree.childrenOf(prjMeta.meta)
  if (children.length > 0) {
    await transferDocuments(client, {
      sourceDocumentIds: children,
      sourceSpaceId: obj.space,
      sourceProjectId: obj.project,

      targetSpaceId: obj.space,
      targetProjectId: obj.project
    })
  }

  const toRemoval = [obj, prjMeta]

  const ops = client.apply()
  for (const doc of toRemoval) {
    await ops.remove(doc)
  }

  await ops.commit()
  return true
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

export async function createFolder (space: DocumentSpace): Promise<void> {
  const project = await getLatestProjectId(space._id)
  const props = {
    space: space._id,
    project: project ?? documents.ids.NoProject
  }
  showPopup(documents.component.CreateFolder, props)
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

export async function moveDocument (doc: ProjectMeta, space: Ref<Space>, target?: ProjectMeta): Promise<void> {
  const client = getClient()

  let parent = documents.ids.NoParent
  let path: Array<Ref<DocumentMeta>> = []
  if (target !== undefined) {
    parent = target.meta
    path = [target.meta, ...target.path]
  }

  const prevRank = await getFirstRank(client, space, doc.project, parent)
  const rank = makeRank(prevRank, undefined)

  await client.update(doc, { parent, path, rank })
}

export async function moveDocumentBefore (doc: ProjectMeta, before: ProjectMeta): Promise<void> {
  const client = getClient()

  const { space, parent, path } = before
  const query = { rank: { $lt: before.rank } as unknown as QuerySelector<ProjectMeta['rank']> }
  const lastRank = await getFirstRank(client, space, doc.project, parent, SortingOrder.Descending, query)
  const rank = makeRank(lastRank, before.rank)

  await client.update(doc, { parent, path, rank })
}

export async function moveDocumentAfter (doc: ProjectMeta, after: ProjectMeta): Promise<void> {
  const client = getClient()

  const { space, parent, path } = after
  const query = { rank: { $gt: after.rank } as unknown as QuerySelector<ProjectMeta['rank']> }
  const nextRank = await getFirstRank(client, space, doc.project, parent, SortingOrder.Ascending, query)
  const rank = makeRank(after.rank, nextRank)

  await client.update(doc, { parent, path, rank })
}

export class DocumentHiearchyQuery {
  queries = {
    prjMeta: createQuery(),
    prjDoc: createQuery()
  }

  bundle: DocumentBundle = { ...emptyBundle() }

  handleUpdate (data: Partial<DocumentBundle>, callback: (tree: ProjectDocumentTree) => void): void {
    this.bundle = { ...this.bundle, ...data }
    callback(new ProjectDocumentTree(this.bundle))
  }

  query (
    space: Ref<DocumentSpace>,
    project: Ref<Project<DocumentSpace>>,
    callback: (tree: ProjectDocumentTree) => void
  ): void {
    project = project ?? documents.ids.NoProject

    this.queries.prjMeta.query(
      documents.class.ProjectMeta,
      { space, project },
      (ProjectMeta) => {
        const DocumentMeta = ProjectMeta.map((e) => e.$lookup?.meta).filter((e) => e !== undefined) as DocumentMeta[]
        const patch: Partial<DocumentBundle> = { ProjectMeta, DocumentMeta }
        this.handleUpdate(patch, callback)
      },
      { lookup: { meta: documents.class.DocumentMeta } }
    )

    this.queries.prjDoc.query(
      documents.class.ProjectDocument,
      { space, project },
      (ProjectDocument) => {
        const ControlledDocument = ProjectDocument.map((e) => e.$lookup?.document as ControlledDocument).filter(
          (e) => e !== undefined
        )
        const patch: Partial<DocumentBundle> = { ProjectDocument, ControlledDocument }
        this.handleUpdate(patch, callback)
      },
      { lookup: { document: documents.class.ControlledDocument } }
    )
  }
}

export function createDocumentHierarchyQuery (): DocumentHiearchyQuery {
  return new DocumentHiearchyQuery()
}

export async function syncDocumentMetaTitle (
  client: Client & TxOperations,
  _id: Ref<DocumentMeta>,
  code: string,
  title: string
): Promise<void> {
  const meta = await client.findOne(documents.class.DocumentMeta, { _id })
  if (meta !== undefined) {
    await client.update(meta, { title: `${code} ${title}` })
  }
}
