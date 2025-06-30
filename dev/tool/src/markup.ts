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

import {
  loadCollabYdoc,
  saveCollabJson,
  saveCollabYdoc,
  yDocCopyXmlField,
  yDocFromBuffer
} from '@hcengineering/collaboration'
import documents from '@hcengineering/controlled-documents'
import core, {
  type AnyAttribute,
  type Blob,
  type Class,
  DOMAIN_TX,
  type Doc,
  type Domain,
  type Hierarchy,
  type LowLevelStorage,
  type MeasureContext,
  MeasureMetricsContext,
  RateLimiter,
  type Ref,
  SortingOrder,
  type Tx,
  type TxCreateDoc,
  type TxUpdateDoc,
  type WorkspaceIds,
  type WorkspaceUuid,
  groupByArray,
  isArchivingMode,
  isDeletingMode,
  makeCollabId,
  makeCollabYdocId,
  makeDocCollabId,
  systemAccountUuid
} from '@hcengineering/core'
import document, { type Document } from '@hcengineering/document'
import { DOMAIN_DOCUMENTS } from '@hcengineering/model-controlled-documents'
import { DOMAIN_DOCUMENT } from '@hcengineering/model-document'
import { getDBClient } from '@hcengineering/postgres'
import { withRetry } from '@hcengineering/retry'
import { getAccountClient } from '@hcengineering/server-client'
import { type PipelineFactory, type StorageAdapter, createDummyStorageAdapter } from '@hcengineering/server-core'
import { createBackupPipeline, createEmptyBroadcastOps } from '@hcengineering/server-pipeline'
import { generateToken } from '@hcengineering/server-token'
import { isEmptyMarkup } from '@hcengineering/text-core'

import { type Db } from 'mongodb'
import { type Sql } from 'postgres'

export interface RestoreWikiContentParams {
  dryRun: boolean
}

export async function restoreWikiContentMongo (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  storageAdapter: StorageAdapter,
  params: RestoreWikiContentParams
): Promise<void> {
  const iterator = db.collection<Document>(DOMAIN_DOCUMENT).find({ _class: document.class.Document })

  let processedCnt = 0
  let restoredCnt = 0

  function printStats (): void {
    console.log('...processed', processedCnt, 'restored', restoredCnt)
  }

  try {
    while (true) {
      const doc = await iterator.next()
      if (doc === null) break

      processedCnt++
      if (processedCnt % 100 === 0) {
        printStats()
      }

      const correctCollabId = { objectClass: doc._class, objectId: doc._id, objectAttr: 'content' }

      const wrongYdocId = await findWikiDocYdocName(ctx, db, doc._id)
      if (wrongYdocId === undefined) {
        console.log('current ydoc not found', doc._id)
        continue
      }

      const stat = storageAdapter.stat(ctx, wsIds, wrongYdocId)
      if (stat === undefined) continue

      const ydoc1 = await loadCollabYdoc(ctx, storageAdapter, wsIds, correctCollabId)
      const ydoc2 = await loadCollabYdoc(ctx, storageAdapter, wsIds, wrongYdocId)

      if (ydoc1 !== undefined && ydoc1.share.has('content')) {
        // There already is content, we should skip the document
        continue
      }

      if (ydoc2 === undefined) {
        // There are no content to restore
        continue
      }

      try {
        console.log('restoring content for', doc._id)
        if (!params.dryRun) {
          if (ydoc2.share.has('description') && !ydoc2.share.has('content')) {
            yDocCopyXmlField(ydoc2, 'description', 'content')
          }

          await saveCollabYdoc(ctx, storageAdapter, wsIds, correctCollabId, ydoc2)
        }
        restoredCnt++
      } catch (err: any) {
        console.error('failed to restore content for', doc._id, err)
      }
    }
  } finally {
    printStats()
    await iterator.close()
  }
}

export async function findWikiDocYdocName (
  ctx: MeasureContext,
  db: Db,
  doc: Ref<Document>
): Promise<Ref<Blob> | undefined> {
  const updateContentTx = await db.collection<TxUpdateDoc<Document & { content: string }>>(DOMAIN_TX).findOne(
    {
      _class: core.class.TxUpdateDoc,
      objectId: doc,
      objectClass: document.class.Document,
      'operations.content': { $exists: true }
    },
    {
      sort: { modifiedOn: SortingOrder.Descending }
    }
  )

  if (updateContentTx?.operations?.content != null) {
    const value = updateContentTx.operations.content as string
    if (value.includes(':')) {
      console.log('found update content tx', doc, value)
      return value.split(':')[0] as Ref<Blob>
    }
  }

  const updateDescriptionTx = await db.collection<TxUpdateDoc<Document & { description: string }>>(DOMAIN_TX).findOne(
    {
      _class: core.class.TxUpdateDoc,
      objectId: doc,
      objectClass: document.class.Document,
      'operations.description': { $exists: true }
    },
    {
      sort: { modifiedOn: SortingOrder.Descending }
    }
  )

  if (updateDescriptionTx?.operations?.description != null) {
    const value = updateDescriptionTx.operations.description
    if (value.includes(':')) {
      console.log('found update description tx', doc, value)
      return value.split(':')[0] as Ref<Blob>
    }
  }

  const createContentTx = await db.collection<TxCreateDoc<Document & { content: string }>>(DOMAIN_TX).findOne({
    _class: core.class.TxCreateDoc,
    objectId: doc,
    objectClass: document.class.Document,
    'attributes.content': { $exists: true }
  })

  if (createContentTx?.attributes?.content != null) {
    const value = createContentTx.attributes.content
    if (value.includes(':')) {
      console.log('found create content tx', doc, value)
      return value.split(':')[0] as Ref<Blob>
    }
  }

  const createContentIdTx = await db.collection<TxCreateDoc<Document & { contentId: Ref<Blob> }>>(DOMAIN_TX).findOne({
    _class: core.class.TxCreateDoc,
    objectId: doc,
    objectClass: document.class.Document,
    'attributes.contentId': { $exists: true }
  })

  if (createContentIdTx?.attributes?.contentId != null) {
    const value = createContentIdTx.attributes.contentId
    console.log('found create contentId tx', doc, value)
    return value
  }
}

export interface RestoreControlledDocContentParams {
  dryRun: boolean
}

export async function restoreControlledDocContentMongo (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  storageAdapter: StorageAdapter,
  params: RestoreWikiContentParams
): Promise<void> {
  const iterator = db.collection<Doc>(DOMAIN_DOCUMENTS).find({
    _class: {
      $in: [documents.class.ControlledDocument, documents.class.ControlledDocumentSnapshot]
    }
  })

  let processedCnt = 0
  let restoredCnt = 0

  function printStats (): void {
    console.log('...processed', processedCnt, 'restored', restoredCnt)
  }

  try {
    while (true) {
      const doc = await iterator.next()
      if (doc === null) break

      const restored = await restoreControlledDocContentForDoc(ctx, db, wsIds, storageAdapter, params, doc, 'content')
      if (restored) {
        restoredCnt++
      }

      processedCnt++
      if (processedCnt % 100 === 0) {
        printStats()
      }
    }
  } finally {
    printStats()
    await iterator.close()
  }
}

export async function restoreControlledDocContentForDoc (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  storageAdapter: StorageAdapter,
  params: RestoreWikiContentParams,
  doc: Doc,
  attribute: string
): Promise<boolean> {
  const tx = await db.collection<TxCreateDoc<Doc>>(DOMAIN_TX).findOne({
    _class: core.class.TxCreateDoc,
    objectId: doc._id,
    objectClass: doc._class
  })

  // It is expected that tx contains attribute with content in old collaborative doc format
  // the original value here looks like '65b7f82f4d422b89d4cbdd6f:HEAD:0'
  const attribures = tx?.attributes ?? {}
  const value = (attribures as any)[attribute] as string
  if (value == null || !value.includes(':')) {
    console.log('no content to restore', doc._class, doc._id)
    return false
  }

  const currentYdocId = value.split(':')[0] as Ref<Blob>
  const ydocId = makeCollabYdocId(makeDocCollabId(doc, attribute))

  // Ensure that we don't have new content in storage
  const stat = await storageAdapter.stat(ctx, wsIds, ydocId)
  if (stat !== undefined) {
    console.log('content already restored', doc._class, doc._id, ydocId)
    return false
  }

  console.log('restoring content', doc._id, currentYdocId, '-->', ydocId)
  if (!params.dryRun) {
    try {
      const stat = await storageAdapter.stat(ctx, wsIds, currentYdocId)
      if (stat === undefined) {
        console.log('no content to restore', doc._class, doc._id, ydocId)
        return false
      }

      const data = await storageAdapter.read(ctx, wsIds, currentYdocId)
      const buffer = Buffer.concat(data as any)
      await storageAdapter.put(ctx, wsIds, ydocId, buffer, 'application/ydoc', buffer.length)
    } catch (err: any) {
      console.error('failed to restore content for', doc._class, doc._id, err)
      return false
    }
  }

  return true
}

export async function restoreMarkupRefsMongo (
  ctx: MeasureContext,
  db: Db,
  wsIds: WorkspaceIds,
  hierarchy: Hierarchy,
  storageAdapter: StorageAdapter
): Promise<void> {
  const classes = hierarchy.getDescendants(core.class.Doc)
  for (const _class of classes) {
    const domain = hierarchy.findDomain(_class)
    if (domain === undefined) continue

    const allAttributes = hierarchy.getAllAttributes(_class)
    const attributes = Array.from(allAttributes.values()).filter((attribute) => {
      return hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)
    })

    if (attributes.length === 0) continue
    if (hierarchy.isMixin(_class) && attributes.every((p) => p.attributeOf !== _class)) continue

    ctx.info('processing', { _class, attributes: attributes.map((p) => p.name) })

    const collection = db.collection<Doc>(domain)
    const iterator = collection.find({ _class })
    try {
      while (true) {
        const doc = await iterator.next()
        if (doc === null) {
          break
        }

        for (const attribute of attributes) {
          const isMixin = hierarchy.isMixin(attribute.attributeOf)

          const attributeName = isMixin ? `${attribute.attributeOf}.${attribute.name}` : attribute.name

          const value = isMixin
            ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
            : ((doc as any)[attribute.name] as string)

          if (typeof value === 'string') {
            continue
          }

          const collabId = makeCollabId(doc._class, doc._id, attribute.name)
          const ydocId = makeCollabYdocId(collabId)

          try {
            const buffer = await storageAdapter.read(ctx, wsIds, ydocId)
            const ydoc = yDocFromBuffer(Buffer.concat(buffer as any))

            const jsonId = await saveCollabJson(ctx, storageAdapter, wsIds, collabId, ydoc)
            await collection.updateOne({ _id: doc._id }, { $set: { [attributeName]: jsonId } })
          } catch {}
        }
      }
    } finally {
      await iterator.close()
    }
  }
}

export async function restoreMarkupRefs (
  dbUrl: string,
  txes: Tx[],
  storageAdapter: StorageAdapter,
  region: string | null
): Promise<void> {
  const token = generateToken(systemAccountUuid, undefined, { service: 'admin', admin: 'true' })
  const ctx = new MeasureMetricsContext('restore-markup-ref', {})

  const accountClient = getAccountClient(token)
  ctx.info('fetching workspaces in region', { region })
  const workspaces = await accountClient.listWorkspaces()
  const workspacesById = workspaces.reduce((map, ws) => map.set(ws.uuid, ws), new Map())
  ctx.info('found workspaces in region', { region, count: workspaces.length })

  const factory: PipelineFactory = createBackupPipeline(ctx, dbUrl, txes, {
    externalStorage: createDummyStorageAdapter(),
    usePassedCtx: true
  })

  const pg = getDBClient(dbUrl)
  const pgClient = await pg.getClient()

  try {
    ctx.info('fetching workspaces to fix', { region })
    const targets = await pgClient<{ workspaceId: WorkspaceUuid, _class: Ref<Class<Doc>> }[]>`
      SELECT "workspaceId", _class, COUNT(*)
      FROM task
      WHERE data->>'description' LIKE '{%'
      GROUP BY "workspaceId", _class
    `

    const workspaceTargets = groupByArray(targets, (it) => it.workspaceId)
    ctx.info('found workspaces to fix', { region, count: workspaceTargets.size })

    for (const [wsUuid, targets] of workspaceTargets) {
      const workspace = workspacesById.get(wsUuid)
      if (workspace === undefined) {
        ctx.warn('workspace not found', { wsUuid, region })
        continue
      }

      const { uuid, name, url, mode } = workspace
      if (isArchivingMode(mode) || isDeletingMode(mode)) {
        ctx.warn('skipping workspace', { uuid, name, url, region, mode })
        continue
      }

      const classes = targets.map((it) => it._class)
      ctx.info('processing workspace', { uuid, name, url, region, classes })

      try {
        const pipeline = await factory(ctx, workspace, createEmptyBroadcastOps(), null)

        try {
          const { hierarchy, lowLevelStorage } = pipeline.context
          if (lowLevelStorage === undefined) {
            ctx.error('Low level storage not available', { region })
            continue
          }

          for (const _class of classes) {
            await restoreMarkupRefsForClass(
              ctx,
              _class,
              workspace,
              hierarchy,
              lowLevelStorage,
              storageAdapter,
              pgClient
            )
          }
        } finally {
          await pipeline.close()
        }
      } catch (err: any) {
        ctx.error('failed to process workspace', { err, uuid, name, url, region })
      }
    }
  } finally {
    pg.close()
  }
}

async function restoreMarkupRefsForClass (
  ctx: MeasureContext,
  _class: Ref<Class<Doc>>,
  wsIds: WorkspaceIds,
  hierarchy: Hierarchy,
  lowLevelStorage: LowLevelStorage,
  storageAdapter: StorageAdapter,
  pgClient: Sql
): Promise<void> {
  const workspace = wsIds.uuid
  const rateLimiter = new RateLimiter(10)

  const domain = hierarchy.findDomain(_class)
  if (domain === undefined) return

  const attributes = findCollabAttributes(hierarchy, _class)
  if (attributes.length === 0) return
  if (hierarchy.isMixin(_class) && attributes.every((p) => p.attributeOf !== _class)) return

  const query = hierarchy.isMixin(_class) ? { [_class]: { $exists: true } } : { _class }
  const iterator = await lowLevelStorage.traverse<Doc>(domain, query)

  let processed = 0

  try {
    while (true) {
      const docs = await iterator.next(100)
      if (docs === null || docs.length === 0) {
        break
      }

      for (const doc of docs) {
        await rateLimiter.add(async () => {
          try {
            await withRetry(() =>
              restoreMarkupRefsForDoc(
                ctx,
                doc,
                domain,
                attributes,
                wsIds,
                hierarchy,
                lowLevelStorage,
                storageAdapter,
                pgClient
              )
            )
            processed++
          } catch (err: any) {
            ctx.error('failed to restore markup refs', { doc: doc._id, class: doc._class, workspace })
          }
        })
      }

      await rateLimiter.waitProcessing()
      ctx.info('...', { _class, workspace, processed })
    }

    await rateLimiter.waitProcessing()
    ctx.info('done', { _class, workspace, processed })
  } finally {
    await iterator.close()
  }
}

async function restoreMarkupRefsForDoc (
  ctx: MeasureContext,
  doc: Doc,
  domain: Domain,
  attributes: AnyAttribute[],
  wsIds: WorkspaceIds,
  hierarchy: Hierarchy,
  lowLevelStorage: LowLevelStorage,
  storageAdapter: StorageAdapter,
  pgClient: Sql
): Promise<void> {
  const workspace = wsIds.uuid

  for (const attribute of attributes) {
    const value = hierarchy.isMixin(attribute.attributeOf)
      ? ((doc as any)[attribute.attributeOf]?.[attribute.name] as string)
      : ((doc as any)[attribute.name] as string)

    if (value == null || value === '') continue
    if (!value.startsWith('{')) continue

    const attributeName = hierarchy.isMixin(attribute.attributeOf)
      ? `${attribute.attributeOf}.${attribute.name}`
      : attribute.name

    if (isEmptyMarkup(value)) {
      // If the value is empty, we can just remove the attribute
      await lowLevelStorage.rawUpdate(domain, { _id: doc._id }, { [attributeName]: null })
    } else {
      // Otherwise try to find the most recent blob for this attribute
      const blobId = await findRecentBlobId(pgClient, workspace, doc, attribute)
      if (blobId !== undefined) {
        // If found, we need to update the document with the blobId
        ctx.info('updating blob', { doc: doc._id, class: doc._class, workspace, attribute: attribute.name, blobId })
        await lowLevelStorage.rawUpdate(domain, { _id: doc._id }, { [attributeName]: blobId })
      } else {
        // If not found, and the content is not empty, we need to save it and update the document with the blobId
        const collabId = makeDocCollabId(doc, attribute.name)
        const blobId = await withRetry(() => saveCollabJson(ctx, storageAdapter, wsIds, collabId, value))
        await lowLevelStorage.rawUpdate(domain, { _id: doc._id }, { [attributeName]: blobId })
        ctx.info('uploading blob', { doc: doc._id, class: doc._class, workspace, attribute: attribute.name, blobId })
      }
    }
  }
}

function findCollabAttributes (hierarchy: Hierarchy, _class: Ref<Class<Doc>>): AnyAttribute[] {
  const allAttributes = hierarchy.getAllAttributes(_class)
  return Array.from(allAttributes.values()).filter((attribute) => {
    return hierarchy.isDerived(attribute.type._class, core.class.TypeCollaborativeDoc)
  })
}

async function findRecentBlobId (
  sql: Sql,
  workspace: string,
  doc: Doc,
  attribute: AnyAttribute
): Promise<string | undefined> {
  const prefix = `${doc._id}-${attribute.name}-%`

  const [blobId] = await sql`
    SELECT name
    FROM blob.blob
    WHERE workspace = ${workspace} AND name LIKE ${prefix} AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  `
  return blobId?.name
}
