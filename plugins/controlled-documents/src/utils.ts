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
  Rank,
  Ref,
  SortingOrder,
  Space,
  TxOperations
} from '@hcengineering/core'
import { LexoDecimal, LexoNumeralSystem36, LexoRank } from 'lexorank'
import LexoRankBucket from 'lexorank/lib/lexoRank/lexoRankBucket'

import documents from './plugin'

import attachment, { Attachment } from '@hcengineering/attachment'
import chunter, { ChatMessage } from '@hcengineering/chunter'
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
import { makeRank } from '@hcengineering/rank'

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

class ProjectDocumentTree {
  rootDocs: ProjectMeta[]
  childrenByParent: Map<Ref<DocumentMeta>, ProjectMeta[]>

  constructor (pjMeta: ProjectMeta[]) {
    this.rootDocs = []
    this.childrenByParent = new Map<Ref<DocumentMeta>, Array<ProjectMeta>>()

    for (const meta of pjMeta) {
      const parentId = meta.path[0] ?? documents.ids.NoParent

      if (!this.childrenByParent.has(parentId)) {
        this.childrenByParent.set(parentId, [])
      }

      this.childrenByParent.get(parentId)?.push(meta)

      if (parentId === documents.ids.NoParent) {
        this.rootDocs.push(meta)
      }
    }
  }

  getDescendants (parent: Ref<DocumentMeta>): Ref<DocumentMeta>[] {
    const result: Ref<DocumentMeta>[] = []
    const queue: Ref<DocumentMeta>[] = [parent]

    while (queue.length > 0) {
      const next = queue.pop()
      if (next === undefined) break

      const children = this.childrenByParent.get(next) ?? []
      const childrenRefs = children.map((p) => p.meta)
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
  const pjMeta = await client.findAll(documents.class.ProjectMeta, { space, project })
  return new ProjectDocumentTree(pjMeta)
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

function emptyBundle (): DocumentBundle {
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

  return Array.from(bundles.values())
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
    sourceTree.getDescendants(id).forEach((d) => docIds.add(d))
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
    if (bundle.ControlledDocument.length < 1) return false

    const isTemplate = hierarchy.hasMixin(bundle.ControlledDocument[0], documents.mixin.DocumentTemplate)
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
