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
//
import {
  ApplyOperations,
  checkPermission,
  Class,
  Data,
  Doc,
  DocumentQuery,
  DocumentUpdate,
  Hierarchy,
  Rank,
  Ref,
  SortingOrder,
  Space,
  Timestamp,
  toIdMap,
  TxOperations,
  type PersonId
} from '@hcengineering/core'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'

import documents from './plugin'

import attachment, { Attachment } from '@hcengineering/attachment'
import chunter, { ChatMessage } from '@hcengineering/chunter'
import { Employee, getCurrentEmployee, Person } from '@hcengineering/contact'
import { makeRank } from '@hcengineering/rank'
import tags, { TagReference } from '@hcengineering/tags'
import {
  ChangeControl,
  ControlledDocument,
  Document,
  DocumentMeta,
  DocumentRequest,
  DocumentSnapshot,
  DocumentSpace,
  DocumentState,
  Project,
  ProjectDocument,
  ProjectMeta
} from './types'
import { RequestStatus } from '@hcengineering/request'

/**
 * @public
 */
export const genRanks = (count: number): Generator<string, void, unknown> =>
  (function * () {
    const sys = new LexoNumeralSystem36()
    const base = 36
    const max = base ** 6
    const gap = LexoDecimal.parse(Math.trunc(max / (count + 2)).toString(base), sys)
    let cur = LexoDecimal.parse('0', sys)

    for (let i = 0; i < count; i++) {
      cur = cur.add(gap)
      yield new LexoRank(LexoRankBucket.BUCKET_0, cur).toString()
    }
  })()

/**
 * @public
 */
export const calcRank = (prev?: { rank: string }, next?: { rank: string }): string => {
  const a = prev?.rank !== undefined ? LexoRank.parse(prev.rank) : LexoRank.min()
  const b = next?.rank !== undefined ? LexoRank.parse(next.rank) : LexoRank.max()

  return a.between(b).toString()
}

/**
 * @public
 */
export async function createChangeControl (
  client: TxOperations,
  ccId: Ref<ChangeControl>,
  ccSpec: Data<ChangeControl>,
  space: Ref<DocumentSpace>
): Promise<void> {
  await client.createDoc(documents.class.ChangeControl, space, ccSpec, ccId)
}

/**
 * @public
 */
export function getDocumentId (document: Pick<Document, 'prefix' | 'seqNumber'>): string {
  return `${document.prefix}-${document.seqNumber}`
}

/** @public */
const documentIdRegExp = /^(?<prefix>\w+)-(?<seqNumber>\d+)$/

/** @public */
export function matchDocumentId (str: string): Pick<Document, 'prefix' | 'seqNumber'> | null {
  const match = str.match(documentIdRegExp)
  if (match?.groups?.prefix === undefined || match.groups.seqNumber === undefined) {
    return null
  }
  return {
    prefix: match.groups.prefix,
    seqNumber: parseFloat(match.groups.seqNumber)
  }
}

/**
 * @public
 */
export function isControlledDocument (client: TxOperations, doc: Document): doc is ControlledDocument {
  return client.getHierarchy().isDerived(doc._class, documents.class.ControlledDocument)
}

/**
 * @public
 */
export type EditorMode = 'viewing' | 'editing' | 'comparing'

/**
 * @public
 */
export async function deleteProjectDrafts (client: ApplyOperations, source: Ref<Project>): Promise<void> {
  const projectDocs = await client.findAll(documents.class.ProjectDocument, { project: source })

  const toDelete = await client.findAll(documents.class.Document, {
    _id: { $in: projectDocs.map((p) => p.document) },
    state: DocumentState.Draft
  })

  for (const doc of toDelete) {
    await client.update(doc, { state: DocumentState.Deleted })
  }
}

export function isCollaborator (doc: ControlledDocument, person: Ref<Employee>): boolean {
  return (
    doc.owner === person ||
    doc.coAuthors.includes(person) ||
    doc.approvers.includes(person) ||
    doc.reviewers.includes(person)
  )
}

export function isFolder (doc: ProjectDocument | undefined): boolean {
  return doc !== undefined && doc.document === documents.ids.Folder
}

function getDocumentSortSequence (doc: ControlledDocument | undefined): number[] {
  return doc !== undefined ? [doc.seqNumber, doc.major, doc.minor, doc.createdOn ?? 0] : [0, 0, 0, 0]
}

export function compareDocumentVersions (
  doc1: ControlledDocument | undefined,
  doc2: ControlledDocument | undefined
): number {
  const s0 = getDocumentSortSequence(doc1)
  const s1 = getDocumentSortSequence(doc2)
  return s0.reduce((r, v, i) => (r !== 0 ? r : s1[i] - v), 0)
}

function extractPresentableStateFromDocumentBundle (bundle: DocumentBundle, prjmeta: ProjectMeta): DocumentBundle {
  bundle = { ...bundle }

  const person = getCurrentEmployee()
  const documentById = toIdMap(bundle.ControlledDocument)

  const prjdoc = bundle.ProjectDocument.filter((prjdoc) => {
    if (prjdoc.attachedTo !== prjmeta._id) return false
    if (isFolder(prjdoc)) return true
    const doc = documentById.get(prjdoc.document as Ref<ControlledDocument>)
    const isPublicState = doc?.state === DocumentState.Effective || doc?.state === DocumentState.Archived
    return doc !== undefined && (isPublicState || isCollaborator(doc, person))
  }).sort((a, b) => {
    return compareDocumentVersions(
      documentById.get(a.document as Ref<ControlledDocument>),
      documentById.get(b.document as Ref<ControlledDocument>)
    )
  })[0]

  const doc = prjdoc !== undefined ? documentById.get(prjdoc.document as Ref<ControlledDocument>) : undefined

  bundle.ProjectMeta = [prjmeta]
  bundle.ProjectDocument = prjdoc !== undefined ? [prjdoc] : []
  bundle.ControlledDocument = doc !== undefined ? [doc] : []

  return bundle
}

export class ProjectDocumentTree {
  parents: Map<Ref<DocumentMeta>, Ref<DocumentMeta>>
  nodesChildren: Map<Ref<DocumentMeta>, DocumentBundle[]>
  nodes: Map<Ref<DocumentMeta>, DocumentBundle>
  links: Map<Ref<Doc>, Ref<DocumentMeta>>

  constructor (bundle?: DocumentBundle) {
    bundle = { ...emptyBundle(), ...bundle }
    const { bundles, links } = compileBundles(bundle)
    this.links = links
    this.nodes = new Map()
    this.nodesChildren = new Map()
    this.parents = new Map()

    bundles.sort((a, b) => {
      const rankA = a.ProjectMeta[0]?.rank ?? ''
      const rankB = b.ProjectMeta[0]?.rank ?? ''
      return rankA.localeCompare(rankB)
    })

    for (const bundle of bundles) {
      const prjmeta = bundle.ProjectMeta[0]
      if (prjmeta === undefined) continue

      const presentable = extractPresentableStateFromDocumentBundle(bundle, prjmeta)
      this.nodes.set(prjmeta.meta, presentable)

      const parent = prjmeta.path[0] ?? documents.ids.NoParent
      this.parents.set(prjmeta.meta, parent)

      if (!this.nodesChildren.has(parent)) {
        this.nodesChildren.set(parent, [])
      }
      this.nodesChildren.get(parent)?.push(bundle)
    }

    const nodesForRemoval = new Set<Ref<DocumentMeta>>()
    for (const [id, node] of this.nodes) {
      const state = node.ControlledDocument[0]?.state
      const isRemoved = state === DocumentState.Obsolete || state === DocumentState.Deleted
      if (isRemoved) nodesForRemoval.add(id)
    }

    for (const id of this.nodes.keys()) {
      if (!nodesForRemoval.has(id)) continue

      const blocked = this.descendantsOf(id).some((node) => !nodesForRemoval.has(node))
      if (blocked) nodesForRemoval.delete(id)
    }

    for (const id of nodesForRemoval) {
      this.nodes.delete(id)
      this.parents.delete(id)
      this.nodesChildren.delete(id)
    }

    for (const [id, children] of this.nodesChildren) {
      this.nodesChildren.set(
        id,
        children.filter((c) => !nodesForRemoval.has(c.ProjectMeta[0].meta))
      )
    }
  }

  metaOf (ref: Ref<Doc> | undefined): Ref<DocumentMeta> | undefined {
    if (ref === undefined) return
    return this.links.get(ref)
  }

  parentChainOf (ref: Ref<DocumentMeta> | undefined): Ref<DocumentMeta>[] {
    if (ref === undefined) return []
    // Found a bug that can cause path field to contain invalid state,
    // until we fix it with migration and a separate fix it's better to use parent.
    //
    // return this.bundleOf(ref)?.ProjectMeta[0]?.path ?? []
    const parents: Ref<DocumentMeta>[] = []
    while (this.parentOf(ref) !== documents.ids.NoParent) {
      ref = this.parentOf(ref)
      parents.push(ref)
    }
    return parents
  }

  parentOf (ref: Ref<DocumentMeta> | undefined): Ref<DocumentMeta> {
    if (ref === undefined) {
      return documents.ids.NoParent
    }
    return this.parents.get(ref) ?? documents.ids.NoParent
  }

  bundleOf (ref: Ref<DocumentMeta> | undefined): DocumentBundle | undefined {
    if (ref === undefined) return
    return this.nodes.get(ref)
  }

  childrenOf (ref: Ref<DocumentMeta> | undefined): Ref<DocumentMeta>[] {
    if (ref === undefined) return []
    return this.nodesChildren.get(ref)?.map((p) => p.ProjectMeta[0].meta) ?? []
  }

  descendantsOf (parent: Ref<DocumentMeta>): Ref<DocumentMeta>[] {
    const result: Ref<DocumentMeta>[] = []
    const queue: Ref<DocumentMeta>[] = [parent]

    while (queue.length > 0) {
      const next = queue.pop()
      if (next === undefined) break

      const children = this.nodesChildren.get(next) ?? []
      const childrenRefs = children.map((p) => p.ProjectMeta[0].meta)
      result.push(...childrenRefs)
      queue.push(...childrenRefs)
    }

    return result
  }
}

export async function findProjectDocsHierarchy (
  client: TxOperations,
  space: Ref<DocumentSpace>,
  project?: Ref<Project<DocumentSpace>>
): Promise<ProjectDocumentTree> {
  const ProjectMeta = await client.findAll(documents.class.ProjectMeta, { space, project })
  return new ProjectDocumentTree({ ...emptyBundle(), ProjectMeta })
}

export interface DocumentBundle {
  DocumentMeta: DocumentMeta[]
  ProjectMeta: ProjectMeta[]
  ProjectDocument: ProjectDocument[]
  ControlledDocument: ControlledDocument[]
  ChangeControl: ChangeControl[]
  DocumentRequest: DocumentRequest[]
  DocumentSnapshot: DocumentSnapshot[]
  ChatMessage: ChatMessage[]
  TagReference: TagReference[]
  Attachment: Attachment[]
}

export function emptyBundle (): DocumentBundle {
  return {
    DocumentMeta: [],
    ProjectMeta: [],
    ProjectDocument: [],
    ControlledDocument: [],
    ChangeControl: [],
    DocumentRequest: [],
    DocumentSnapshot: [],
    ChatMessage: [],
    TagReference: [],
    Attachment: []
  }
}

export function compileBundles (all: DocumentBundle): {
  bundles: DocumentBundle[]
  links: Map<Ref<Doc>, Ref<DocumentMeta>>
} {
  const bundles = new Map<Ref<DocumentMeta>, DocumentBundle>(all.DocumentMeta.map((m) => [m._id, { ...emptyBundle() }]))
  const links = new Map<Ref<Doc>, Ref<DocumentMeta>>()

  const link = (ref: Ref<Doc>, lookup: Ref<Doc>): void => {
    const meta = links.get(lookup)
    if (meta !== undefined) links.set(ref, meta)
  }

  const relink = (ref: Ref<Doc>, prop: keyof DocumentBundle, obj: DocumentBundle[typeof prop][0]): void => {
    const meta = links.get(ref)
    if (meta !== undefined) bundles.get(meta)?.[prop].push(obj as any)
  }

  for (const m of all.DocumentMeta) links.set(m._id, m._id) // DocumentMeta -> DocumentMeta
  for (const m of all.ProjectMeta) links.set(m._id, m.meta) // ProjectMeta -> DocumentMeta
  for (const m of all.ProjectDocument) {
    link(m._id, m.attachedTo) // ProjectDocument -> ProjectMeta
    link(m.document, m.attachedTo) // ControlledDocument -> ProjectMeta
  }
  for (const m of all.ControlledDocument) link(m.changeControl, m.attachedTo) // ChangeControl -> ControlledDocument
  for (const m of all.DocumentRequest) link(m._id, m.attachedTo) // DocumentRequest -> ControlledDocument
  for (const m of all.DocumentSnapshot) link(m._id, m.attachedTo) // DocumentSnapshot -> ControlledDocument
  for (const m of all.ChatMessage) link(m._id, m.attachedTo) // ChatMessage -> (ControlledDocument | ChatMessage)
  for (const m of all.TagReference) link(m._id, m.attachedTo) // TagReference -> ControlledDocument
  for (const m of all.Attachment) link(m._id, m.attachedTo) // Attachment -> (ControlledDocument | ChatMessage)

  let key: keyof DocumentBundle
  for (key in all) {
    all[key].forEach((value) => {
      relink(value._id, key, value)
    })
  }

  return { bundles: Array.from(bundles.values()), links }
}

export async function findAllDocumentBundles (
  client: TxOperations,
  ids: Ref<DocumentMeta>[]
): Promise<DocumentBundle[]> {
  const all: DocumentBundle = { ...emptyBundle() }

  async function crawl<T extends Doc, P extends keyof T> (
    _class: Ref<Class<T>>,
    bkey: keyof DocumentBundle,
    prop: P,
    ids: T[P][]
  ): Promise<T[]> {
    const data = await client.findAll(_class, { [prop]: { $in: ids } } as any)
    all[bkey].push(...(data as any))
    return data
  }

  await crawl(documents.class.DocumentMeta, 'DocumentMeta', '_id', ids)
  await crawl(
    documents.class.ProjectMeta,
    'ProjectMeta',
    'meta',
    all.DocumentMeta.map((m) => m._id)
  )
  await crawl(
    documents.class.ProjectDocument,
    'ProjectDocument',
    'attachedTo',
    all.ProjectMeta.map((m) => m._id)
  )
  await crawl(
    documents.class.ControlledDocument,
    'ControlledDocument',
    'attachedTo',
    all.DocumentMeta.map((m) => m._id)
  )
  await crawl(
    documents.class.ChangeControl,
    'ChangeControl',
    '_id',
    all.ControlledDocument.map((p) => p.changeControl)
  )
  await crawl(
    documents.class.DocumentRequest,
    'DocumentRequest',
    'attachedTo',
    all.ControlledDocument.map((p) => p._id)
  )
  await crawl(
    documents.class.DocumentSnapshot,
    'DocumentSnapshot',
    'attachedTo',
    all.ControlledDocument.map((p) => p._id)
  )
  await crawl(
    documents.class.DocumentComment,
    'ChatMessage',
    'attachedTo',
    all.ControlledDocument.map((p) => p._id)
  )
  await crawl(
    chunter.class.ThreadMessage,
    'ChatMessage',
    'attachedTo',
    all.ChatMessage.map((p) => p._id)
  )
  await crawl(
    tags.class.TagReference,
    'TagReference',
    'attachedTo',
    all.ControlledDocument.map((p) => p._id)
  )
  await crawl(attachment.class.Attachment, 'Attachment', 'attachedTo', [
    ...all.ChatMessage.map((p) => p._id),
    ...all.ControlledDocument.map((p) => p._id)
  ])

  return compileBundles(all).bundles
}

export async function findOneDocumentBundle (
  client: TxOperations,
  id: Ref<DocumentMeta>
): Promise<DocumentBundle | undefined> {
  const bundles = await findAllDocumentBundles(client, [id])
  return bundles[0]
}

export interface DocumentTransferRequest {
  sourceDocumentIds: Ref<DocumentMeta>[]
  sourceSpaceId: Ref<DocumentSpace>
  sourceProjectId?: Ref<Project<DocumentSpace>>

  targetSpaceId: Ref<DocumentSpace>
  targetParentId?: Ref<DocumentMeta>
  targetProjectId?: Ref<Project<DocumentSpace>>
}

interface DocumentTransferContext {
  request: DocumentTransferRequest
  bundles: DocumentBundle[]

  sourceTree: ProjectDocumentTree
  targetTree: ProjectDocumentTree

  sourceSpace: DocumentSpace
  targetSpace: DocumentSpace

  targetParentBundle?: DocumentBundle
}

async function _buildDocumentTransferContext (
  client: TxOperations,
  request: DocumentTransferRequest
): Promise<DocumentTransferContext | undefined> {
  const sourceTree = await findProjectDocsHierarchy(client, request.sourceSpaceId, request.sourceProjectId)
  const targetTree = await findProjectDocsHierarchy(client, request.targetSpaceId, request.targetProjectId)

  const docIds = new Set<Ref<DocumentMeta>>(request.sourceDocumentIds)
  for (const id of request.sourceDocumentIds) {
    sourceTree.descendantsOf(id).forEach((d) => docIds.add(d))
  }

  const bundles = await findAllDocumentBundles(client, Array.from(docIds))
  const targetParentBundle =
    request.targetParentId !== undefined ? await findOneDocumentBundle(client, request.targetParentId) : undefined

  const sourceSpace = await client.findOne(documents.class.DocumentSpace, { _id: request.sourceSpaceId })
  const targetSpace = await client.findOne(documents.class.DocumentSpace, { _id: request.targetSpaceId })

  if (sourceSpace === undefined || targetSpace === undefined) return

  return {
    request,
    bundles,
    sourceTree,
    targetTree,
    sourceSpace,
    targetSpace,
    targetParentBundle
  }
}

export async function listDocumentsAffectedByTransfer (
  client: TxOperations,
  req: DocumentTransferRequest
): Promise<DocumentMeta[]> {
  const cx = await _buildDocumentTransferContext(client, req)
  return cx?.bundles.map((b) => b.DocumentMeta[0]) ?? []
}

/**
 * @public
 */
export async function canTransferDocuments (client: TxOperations, req: DocumentTransferRequest): Promise<boolean> {
  const cx = await _buildDocumentTransferContext(client, req)
  return cx !== undefined ? await _transferDocuments(client, cx, 'check') : false
}

/**
 * @public
 */
export async function transferDocuments (client: TxOperations, req: DocumentTransferRequest): Promise<boolean> {
  const cx = await _buildDocumentTransferContext(client, req)
  return cx !== undefined ? await _transferDocuments(client, cx) : false
}

async function _transferDocuments (
  client: TxOperations,
  cx: DocumentTransferContext,
  mode: 'default' | 'check' = 'default'
): Promise<boolean> {
  if (cx.bundles.length < 1) return false
  if (cx.targetSpace._id === cx.sourceSpace._id) return false

  const hierarchy = client.getHierarchy()

  const canArchiveInSourceSpace = await checkPermission(
    client,
    documents.permission.ArchiveDocument,
    cx.request.sourceSpaceId
  )
  const canCreateInTargetSpace = await checkPermission(
    client,
    documents.permission.CreateDocument,
    cx.request.targetSpaceId
  )

  if (!canArchiveInSourceSpace || !canCreateInTargetSpace) return false

  for (const bundle of cx.bundles) {
    if (bundle.DocumentMeta.length !== 1) return false
    if (bundle.ProjectMeta.length !== 1) return false
    if (bundle.DocumentMeta[0].space !== cx.request.sourceSpaceId) return false

    const anydoc = bundle.ControlledDocument[0]
    const isTemplate = anydoc !== undefined && hierarchy.hasMixin(anydoc, documents.mixin.DocumentTemplate)
    if (isTemplate && hierarchy.isDerived(cx.targetSpace._class, documents.class.ExternalSpace)) return false
  }

  const roots = new Set(cx.request.sourceDocumentIds)
  const updates = new Map<Doc, Partial<Doc>>()

  function update<T extends Doc> (document: T, update: Partial<T>): void {
    updates.set(document, { ...updates.get(document), ...update })
  }

  const parentMeta = cx.targetParentBundle?.ProjectMeta[0]
  const project = cx.request.targetProjectId ?? documents.ids.NoProject

  if (cx.targetParentBundle !== undefined && parentMeta === undefined) return false

  let lastRank: Rank | undefined
  if (parentMeta !== undefined) {
    lastRank = await getFirstRank(client, cx.targetSpace._id, project, parentMeta.meta)
  }

  for (const bundle of cx.bundles) {
    const projectMeta = bundle.ProjectMeta[0]

    if (roots.has(projectMeta.meta)) {
      const path = parentMeta?.path !== undefined ? [parentMeta.meta, ...parentMeta.path] : []
      const parent = path[0] ?? documents.ids.NoParent
      const rank = makeRank(lastRank, undefined)
      update(projectMeta, { parent, path, rank })
    }

    let key: keyof DocumentBundle
    for (key in bundle) {
      bundle[key].forEach((doc) => {
        update(doc, { space: cx.targetSpace._id })
      })
    }

    for (const m of bundle.ProjectMeta) update(m, { project })
    for (const m of bundle.ProjectDocument) update(m, { project })
  }

  if (mode === 'check') return true

  const ops = client.apply()
  for (const u of updates) await ops.update(u[0], u[1])

  const commit = await ops.commit()
  return commit.result
}

export interface DocumentApprovalState {
  person?: Ref<Person>
  role: 'author' | 'reviewer' | 'approver'
  state: 'approved' | 'rejected' | 'cancelled' | 'waiting'
  timestamp?: Timestamp
  messages?: ChatMessage[]
}

export interface DocumentValidationState {
  requests: DocumentRequest[]
  snapshot?: DocumentSnapshot
  document: ControlledDocument
  approvals: DocumentApprovalState[]
  modifiedOn?: Timestamp
}

export function extractValidationWorkflow (
  hierarchy: Hierarchy,
  bundle: DocumentBundle,
  accountIdToPerson: (ref: PersonId) => Ref<Person> | undefined
): Map<Ref<ControlledDocument>, DocumentValidationState[]> {
  const result: ReturnType<typeof extractValidationWorkflow> = new Map()

  const getApprovalStates = (request: DocumentRequest | undefined): DocumentApprovalState[] => {
    if (request === undefined) return []

    const role = hierarchy.isDerived(request._class, documents.class.DocumentReviewRequest) ? 'reviewer' : 'approver'

    const rejected: DocumentApprovalState[] =
      request.rejected !== undefined
        ? [
            {
              person: request.rejected,
              role,
              state: 'rejected',
              timestamp: request.modifiedOn
            }
          ]
        : []

    const approved: DocumentApprovalState[] = request.approved.map((person, idx) => {
      return {
        person,
        role,
        state: 'approved',
        timestamp: request.approvedDates?.[idx] ?? request.modifiedOn
      }
    })

    const ignored: DocumentApprovalState[] = request.requested
      .filter((person) => person !== request.rejected)
      .filter((person) => !request.approved.includes(person))
      .map((person) => {
        return {
          person,
          role,
          state: request.rejected !== undefined ? 'cancelled' : 'waiting'
        }
      })

    const states = [...rejected, ...approved, ...ignored]

    const messages = bundle.ChatMessage.filter((m) => m.attachedTo === request._id)
    for (const state of states) {
      state.messages = messages.filter((m) => accountIdToPerson(m.createdBy ?? m.modifiedBy) === state.person)
    }

    return states
  }

  for (const document of bundle.ControlledDocument) {
    const snapshots = bundle.DocumentSnapshot.filter((s) => s.attachedTo === document._id).sort(
      (a, b) => (a.createdOn ?? 0) - (b.createdOn ?? 0)
    )
    const requests = bundle.DocumentRequest.filter((s) => s.attachedTo === document._id).sort(
      (a, b) => (a.createdOn ?? 0) - (b.createdOn ?? 0)
    )

    const states: DocumentValidationState[] = [...snapshots, undefined].map((snapshot) => {
      return {
        requests: [],
        snapshot,
        document,
        approvals: [],
        messages: []
      }
    })

    for (const request of requests) {
      if (request.status === RequestStatus.Cancelled) {
        continue
      }
      const state =
        states.find((s) => (s.snapshot?.createdOn ?? 0) > (request.createdOn ?? 0)) ?? states[states.length - 1]
      state.requests.push(request)
    }

    for (const state of states) {
      const review = state.requests.findLast((r) =>
        hierarchy.isDerived(r._class, documents.class.DocumentReviewRequest)
      )
      let approval = state.requests.findLast((r) =>
        hierarchy.isDerived(r._class, documents.class.DocumentApprovalRequest)
      )

      if ((approval?.createdOn ?? 0) < (review?.createdOn ?? 0)) approval = undefined

      const anchor = review ?? approval
      const author =
        anchor?.createdBy !== undefined ? accountIdToPerson?.(anchor.createdBy) ?? document.author : document.author

      state.approvals = [
        {
          person: author,
          role: 'author',
          state: anchor !== undefined ? 'approved' : 'waiting',
          timestamp: anchor !== undefined ? anchor.createdOn ?? document.createdOn : undefined
        },
        ...getApprovalStates(review),
        ...getApprovalStates(approval)
      ]

      if (state.requests.length > 0) {
        state.modifiedOn = Math.max(...state.requests.map((r) => r.modifiedOn ?? 0))
      }
    }

    states.reverse()
    result.set(document._id, states)
  }

  return result
}

/**
 * @public
 */
export async function copyProjectDocuments (
  client: ApplyOperations,
  source: Ref<Project>,
  target: Ref<Project>
): Promise<void> {
  const projectMeta = await client.findAll(documents.class.ProjectMeta, { project: source })
  const projectDocs = await client.findAll(documents.class.ProjectDocument, { project: source })

  const projectDocsByMeta = new Map<Ref<ProjectMeta>, ProjectDocument[]>()
  for (const doc of projectDocs) {
    const docs = projectDocsByMeta.get(doc.attachedTo) ?? []
    docs.push(doc)
    projectDocsByMeta.set(doc.attachedTo, docs)
  }

  for (const meta of projectMeta) {
    // copy meta
    const projectMetaId = await client.createDoc(documents.class.ProjectMeta, meta.space, {
      project: target,
      meta: meta.meta,
      path: meta.path,
      parent: meta.parent,
      documents: meta.documents,
      rank: meta.rank
    })

    // copy project docs attached to meta
    const projectDocs = projectDocsByMeta.get(meta._id) ?? []
    for (const doc of projectDocs) {
      await client.addCollection(
        documents.class.ProjectDocument,
        meta.space,
        projectMetaId,
        documents.class.ProjectMeta,
        'documents',
        {
          project: target,
          initial: doc.initial,
          document: doc.document
        }
      )
    }
  }
}

/**
 * @public
 */
export async function getFirstRank (
  client: TxOperations,
  space: Ref<Space>,
  project: Ref<Project>,
  parent: Ref<DocumentMeta>,
  sort: SortingOrder = SortingOrder.Descending,
  extra: DocumentQuery<ProjectMeta> = {}
): Promise<Rank | undefined> {
  const doc = await client.findOne(
    documents.class.ProjectMeta,
    { space, project, parent, ...extra },
    { sort: { rank: sort }, projection: { rank: 1 } }
  )

  return doc?.rank
}

/**
 * @public
 */
export function getEffectiveDocUpdate (): DocumentUpdate<ControlledDocument> {
  return {
    state: DocumentState.Effective,
    effectiveDate: Date.now(),
    controlledState: undefined
  }
}

/**
 * @public
 */
export function getDocumentName (doc: Document): string {
  return `${doc.code} ${doc.title}`
}

export const periodicReviewIntervals: readonly number[] = [6, 12, 18, 24, 30, 36]

/**
 * @public
 */
export const DEFAULT_PERIODIC_REVIEW_INTERVAL: Readonly<number> = periodicReviewIntervals[1]

/**
 * @public
 */
export const TEMPLATE_PREFIX = 'TMPL'
