//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import attachmentPlugin, { type Attachment } from '@hcengineering/attachment'
import contactPlugin from '@hcengineering/contact'
import core, {
  type AnyAttribute,
  type AttachedDoc,
  type Blob,
  type Class,
  DOMAIN_MIGRATION,
  DOMAIN_MODEL,
  type Doc,
  type Domain,
  type FullTextSearchContext,
  type Hierarchy,
  type IdMap,
  type MeasureContext,
  type MigrationState,
  type ModelDb,
  type Ref,
  type Space,
  type TxCUD,
  TxProcessor,
  type WorkspaceIds,
  type WorkspaceUuid,
  coreId,
  docKey,
  generateId,
  getFullTextIndexableAttributes,
  groupByArray,
  isClassIndexable,
  isFullTextAttribute,
  isIndexedAttribute,
  platformNow,
  systemAccount,
  toIdMap,
  withContext
} from '@hcengineering/core'
import drivePlugin, { type FileVersion } from '@hcengineering/drive'
import type {
  ConsumerControl,
  ContentTextAdapter,
  DbAdapter,
  FullTextAdapter,
  IndexedDoc,
  StorageAdapter
} from '@hcengineering/server-core'
import { RateLimiter, SessionDataImpl } from '@hcengineering/server-core'
import { jsonToText, markupToJSON, markupToText } from '@hcengineering/text'
import { findSearchPresenter, updateDocWithPresenter } from '../mapper'
import { type FullTextPipeline } from './types'
import { createIndexedDoc, getContent } from './utils'

export * from './types'
export * from './utils'

const textLimit = 500 * 1024

// Global Memory management configuration

/**
 * @public
 */
export const globalIndexer = {
  allowParallel: 10,
  processingSize: 100
}

let indexCounter = 0

function extractValues (obj: any): string {
  let res = ''

  const o = [obj]
  while (o.length > 0) {
    const oo = o.shift()
    if (typeof oo === 'object') {
      o.push(Object.values(oo))
      continue
    }
    if (Array.isArray(oo)) {
      o.push(...oo)
      continue
    }
    res += `${oo} `
  }
  return res
}

class ElasticPushQueue {
  pushQueue = new RateLimiter(5)
  indexedDocs: IndexedDoc[] = []

  constructor (
    readonly fulltextAdapter: FullTextAdapter,
    readonly workspace: WorkspaceIds,
    readonly ctx: MeasureContext,
    readonly control?: ConsumerControl
  ) {}

  async push (doc: IndexedDoc): Promise<void> {
    this.indexedDocs.push(doc)
    if (this.indexedDocs.length > 25) {
      await this.pushToIndex()
    }
  }

  async waitProcessing (): Promise<void> {
    if (this.indexedDocs.length > 0) {
      await this.pushToIndex()
    }
    await this.pushQueue.waitProcessing()
  }

  async pushToIndex (): Promise<void> {
    const docs = [...this.indexedDocs]
    this.indexedDocs = []
    if (docs.length === 0) {
      return
    }
    await this.pushQueue.add(async () => {
      try {
        try {
          await this.ctx.with('push-elastic', {}, () =>
            this.fulltextAdapter.updateMany(this.ctx, this.workspace.uuid, docs)
          )

          await this.control?.heartbeat()
        } catch (err: any) {
          Analytics.handleError(err)
          // Try to push one by one
          await this.ctx.with('push-elastic-by-one', {}, async () => {
            for (const d of docs) {
              try {
                await this.fulltextAdapter.update(this.ctx, this.workspace.uuid, d.id, d)
              } catch (err2: any) {
                Analytics.handleError(err2)
              }
            }
          })
        }
      } catch (err: any) {
        Analytics.handleError(err)
      }
    })
  }
}

/**
 * @public
 */
export class FullTextIndexPipeline implements FullTextPipeline {
  cancelling: boolean = false

  indexId = indexCounter++

  contexts: Map<Ref<Class<Doc>>, FullTextSearchContext>

  constructor (
    readonly fulltextAdapter: FullTextAdapter,
    private readonly storage: DbAdapter,
    readonly hierarchy: Hierarchy,
    readonly workspace: WorkspaceIds,
    readonly metrics: MeasureContext,
    readonly model: ModelDb,
    readonly storageAdapter: StorageAdapter,
    readonly contentAdapter: ContentTextAdapter,
    readonly broadcastUpdate: (ctx: MeasureContext, classes: Ref<Class<Doc>>[]) => void
  ) {
    this.contexts = new Map(model.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it]))
  }

  async getIndexClassess (): Promise<{ domain: Domain, classes: Ref<Class<Doc>>[] }[]> {
    const allClasses = this.hierarchy.getDescendants(core.class.Doc)
    const contexts = new Map(this.model.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it]))
    const allIndexed = allClasses.filter((it) => isClassIndexable(this.hierarchy, it, contexts))
    const domainPriorities: Record<string, number> = {
      space: 1500,
      contact: 1000,
      task: 500,
      recruit: 400,
      document: 300,
      attachment: -100
    }

    const byDomain = groupByArray(allIndexed, (it) => this.hierarchy.getDomain(it))
    return Array.from(byDomain.entries())
      .sort((a, b) => {
        const ap = domainPriorities[a[0]] ?? 0
        const bp = domainPriorities[b[0]] ?? 0
        return bp - ap
      })
      .map((it) => ({
        domain: it[0],
        classes: it[1]
      }))
  }

  async reindex (
    ctx: MeasureContext,
    domain: Domain,
    classes: Ref<Class<Doc>>[],
    control?: ConsumerControl
  ): Promise<void> {
    ctx.warn('verify document structure', { workspace: this.workspace.uuid })

    let processed = 0
    await ctx.with('reindex-domain', { domain }, async (ctx) => {
      // Iterate over all domain documents and add appropriate entries
      const allDocs = this.storage.rawFind(ctx, domain)
      try {
        let lastPrint = 0
        const pushQueue = new ElasticPushQueue(this.fulltextAdapter, this.workspace, ctx, control)
        while (true) {
          if (control !== undefined) {
            await control?.heartbeat()
          }
          const docs = await allDocs.find(ctx)
          if (docs.length === 0) {
            break
          }
          const byClass = groupByArray<Doc, Ref<Class<Doc>>>(docs, (it) => it._class)

          for (const [v, values] of byClass.entries()) {
            if (!isClassIndexable(this.hierarchy, v, this.contexts)) {
              // Skip non indexable classes
              continue
            }

            await this.indexDocuments(ctx, v, values, pushQueue)
            await control?.heartbeat()
          }

          processed += docs.length

          // Define the thresholds for logging

          // Find the next threshold to print

          const now = platformNow()
          if (now - lastPrint > 2500) {
            ctx.info('processed', { processed, elapsed: Math.round(now - lastPrint), domain })
            lastPrint = now
          }
        }
        await pushQueue.waitProcessing()
      } catch (err: any) {
        ctx.error('failed to restore index state', { err })
      } finally {
        await allDocs.close()
      }
    })
    ctx.warn('reinex done', { domain, processed })
  }

  async dropWorkspace (control?: ConsumerControl): Promise<void> {
    if (this.workspace.dataId != null) {
      await this.fulltextAdapter.clean(this.metrics, this.workspace.dataId as unknown as WorkspaceUuid)
    }
    await this.fulltextAdapter.clean(this.metrics, this.workspace.uuid)
  }

  broadcastClasses = new Set<Ref<Class<Doc>>>()
  broadcasts: number = 0

  private async addMigration (ctx: MeasureContext, state: string): Promise<void> {
    const mstate: MigrationState = {
      _class: core.class.MigrationState,
      _id: generateId(),
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      space: core.space.Configuration,
      plugin: coreId,
      state
    }
    await this.storage.upload(ctx, DOMAIN_MIGRATION, [mstate])
  }

  scheduleBroadcast (): void {
    if (!this.cancelling) {
      // We need to send index update event
      if (this.broadcasts === 0) {
        this.broadcasts++
        setTimeout(() => {
          this.broadcasts = 0
          if (this.broadcastClasses.size > 0) {
            const toSend = Array.from(this.broadcastClasses.values())
            this.broadcastClasses.clear()
            this.broadcastUpdate(this.metrics, toSend)
          }
        }, 5000)
      }
    }
  }

  private async findParents (ctx: MeasureContext, docs: AttachedDoc[]): Promise<IdMap<Doc>> {
    const result: Doc[] = []
    const groups = groupByArray(docs, (doc) => doc.attachedToClass)
    for (const [_class, _docs] of groups) {
      const pids = Array.from(new Set(_docs.map((it) => it.attachedTo)))
      try {
        const gdocs = await ctx.with('find-spaces', {}, (ctx) =>
          this.storage.findAll<Doc>(
            ctx,
            _class,
            {
              _id: {
                $in: pids
              }
            },
            {
              skipSpace: true
            }
          )
        )
        result.push(...gdocs)
      } catch (err: any) {
        ctx.error('failed to find parents for', {
          _class,
          pids,
          docCl: Array.from(new Set(_docs.map((it) => it._class)))
        })
        continue
      }
    }
    return toIdMap(result)
  }

  async indexDocuments (
    ctx: MeasureContext,
    _class: Ref<Class<Doc>>,
    docs: Doc[],
    pushQueue: ElasticPushQueue
  ): Promise<void> {
    let spaceDocs: IdMap<Space> | undefined
    const updateSpaces = async (): Promise<void> => {
      spaceDocs = toIdMap(
        await ctx.with('find-spaces', {}, (ctx) =>
          this.storage.findAll(
            ctx,
            core.class.Space,
            {
              _id: {
                $in: Array.from(new Set(docs.map((doc) => doc.space)))
              }
            },
            {
              skipClass: true,
              skipSpace: true
            }
          )
        )
      )
    }
    const searchPresenter = findSearchPresenter(this.hierarchy, _class)

    let parentDocs: IdMap<Doc> | undefined

    const rateLimit = new RateLimiter(10)
    // We need to add all to broadcast update
    for (const doc of docs) {
      if (typeof doc._id === 'object') {
        doc._id = (doc._id as any).toString()
      }
      this.broadcastClasses.add(doc._class)
      if (this.cancelling) {
        return
      }
      const indexedDoc = createIndexedDoc(doc, this.hierarchy.findAllMixins(doc), doc.space)

      await rateLimit.exec(async () => {
        await ctx.with('process-document', { _class: doc._class }, async (ctx) => {
          try {
            // Collect all indexable values
            const attributes = getFullTextIndexableAttributes(this.hierarchy, doc._class)
            const content = getContent(this.hierarchy, attributes, doc)

            indexedDoc.fulltextSummary = ''

            for (const [, v] of Object.entries(content)) {
              if (v.attr.type._class === core.class.TypeBlob) {
                await this.processBlob(ctx, v, doc, indexedDoc)
                continue
              }

              if (v.attr.type._class === core.class.TypeCollaborativeDoc) {
                await this.processCollaborativeDoc(ctx, v, indexedDoc)
                continue
              }
              if ((isFullTextAttribute(v.attr) || v.attr.isCustom === true) && v.value !== undefined) {
                if (v.attr.type._class === core.class.TypeMarkup) {
                  ctx.withSync('markup-to-json-text', {}, () => {
                    indexedDoc.fulltextSummary += '\n' + jsonToText(markupToJSON(v.value))
                  })
                } else {
                  indexedDoc.fulltextSummary += '\n' + v.value
                }

                continue
              }

              if (isIndexedAttribute(v.attr)) {
                // We need to put indexed attr in place

                // Check for content changes and collect update
                const dKey = docKey(v.attr.name, v.attr.attributeOf)
                if (dKey !== '_class') {
                  if (typeof v.value !== 'object') {
                    indexedDoc[dKey] = v.value
                  } else {
                    // We need to extract only values
                    indexedDoc[dKey] = extractValues(v.value)
                  }
                }
                continue
              }
            }

            // trim to large content
            if (indexedDoc.fulltextSummary.length > textLimit) {
              indexedDoc.fulltextSummary = indexedDoc.fulltextSummary.slice(0, textLimit)
            }

            if (searchPresenter !== undefined) {
              await ctx.with('update-search-presenter', { _class: doc._class }, async () => {
                if (parentDocs === undefined) {
                  parentDocs = this.hierarchy.isDerived(_class, core.class.AttachedDoc)
                    ? await this.findParents(ctx, docs as unknown as AttachedDoc[])
                    : undefined
                }
                const parentDoc = parentDocs?.get((doc as AttachedDoc).attachedTo)
                if (spaceDocs === undefined) {
                  await updateSpaces()
                }
                const spaceDoc = spaceDocs?.get(doc.space) // docState.$lookup?.space
                await updateDocWithPresenter(this.hierarchy, doc, indexedDoc, parentDoc, spaceDoc, searchPresenter)
              })
            }

            indexedDoc.id = doc._id
            indexedDoc.space = doc.space

            await pushQueue.push(indexedDoc)
          } catch (err: any) {
            ctx.error('failed to process document', {
              id: doc._id,
              class: doc._class,
              workspace: this.workspace.uuid
            })
            Analytics.handleError(err)
          }
        })
      })
    }
    await rateLimit.waitProcessing()
  }

  public async processDocuments (ctx: MeasureContext, result: TxCUD<Doc>[], control: ConsumerControl): Promise<void> {
    const contextData = this.createContextData()
    ctx.contextData = contextData
    // Find documents matching query

    // We need to update hierarchy and local model if required.

    for (const tx of result) {
      this.hierarchy.tx(tx)
      const domain = this.hierarchy.findDomain(tx.objectClass)
      if (domain === DOMAIN_MODEL) {
        await this.model.tx(tx)
      }
    }

    const byClass = groupByArray<TxCUD<Doc>, Ref<Class<Doc>>>(result, (it) => it.objectClass)

    const pushQueue = new ElasticPushQueue(this.fulltextAdapter, this.workspace, ctx, control)

    const toRemove: { _id: Ref<Doc>, _class: Ref<Class<Doc>> }[] = []

    for (const [v, values] of byClass.entries()) {
      if (!isClassIndexable(this.hierarchy, v, this.contexts)) {
        // Skip non indexable classes
        continue
      }

      // We need to load documents from storage
      const docs: Doc[] = await this.loadDocsFromTx(values, toRemove, ctx, v)

      await this.indexDocuments(ctx, v, docs, pushQueue)
    }

    try {
      if (toRemove.length !== 0) {
        // We need to add broadcast information
        for (const _cl of new Set(toRemove.values().map((it) => it._class))) {
          this.broadcastClasses.add(_cl)
        }
        await this.fulltextAdapter.remove(
          ctx,
          this.workspace.uuid,
          toRemove.map((it) => it._id)
        )
      }
    } catch (err: any) {
      Analytics.handleError(err)
    }

    await pushQueue.waitProcessing()
    this.scheduleBroadcast()
  }

  private async loadDocsFromTx (
    values: TxCUD<Doc<Space>>[],
    toRemove: { _id: Ref<Doc<Space>>, _class: Ref<Class<Doc>> }[],
    ctx: MeasureContext<any>,
    v: Ref<Class<Doc<Space>>>
  ): Promise<Doc[]> {
    const byDoc = groupByArray(values, (it) => it.objectId)

    const docsToRetrieve = new Set<Ref<Doc>>()

    const docs: Doc[] = []

    // We need to find documents we need to retrieve
    for (const [docId, txes] of byDoc.entries()) {
      // Check if we have create tx, we do not need to retrieve a doc, just combine all updates
      txes.sort((a, b) => a.modifiedOn - b.modifiedOn)
      const doc = TxProcessor.buildDoc2Doc(txes)

      switch (doc) {
        case null:
          toRemove.push({ _id: docId, _class: txes[0].objectClass })
          break
        case undefined:
          docsToRetrieve.add(docId)
          break
        default:
          docs.push(doc)
      }
    }
    if (docsToRetrieve.size > 0) {
      docs.push(...(await this.storage.findAll(ctx, v, { _id: { $in: Array.from(docsToRetrieve) } })))
    }
    return docs
  }

  private createContextData (): SessionDataImpl {
    return new SessionDataImpl(
      systemAccount,
      '',
      true,
      undefined,
      this.workspace,
      null,
      false,
      undefined,
      undefined,
      this.model,
      new Map()
    )
  }

  @withContext('process-collaborative-doc')
  private async processCollaborativeDoc (
    ctx: MeasureContext<any>,
    v: { value: any, attr: AnyAttribute },
    indexedDoc: IndexedDoc
  ): Promise<void> {
    const value = v.value as Ref<Blob>
    if (value !== undefined && value !== '') {
      try {
        const readable = await this.storageAdapter?.read(ctx, this.workspace, value)
        const markup = Buffer.concat(readable as any).toString()
        let textContent = markupToText(markup)
        textContent = textContent
          .split(/ +|\t+|\f+/)
          .filter((it) => it)
          .join(' ')
          .split(/\n\n+/)
          .join('\n')

        indexedDoc.fulltextSummary += '\n' + textContent
      } catch (err: any) {
        Analytics.handleError(err)
        ctx.error('failed to handle blob', { _id: value, workspace: this.workspace.uuid })
      }
    }
  }

  @withContext('process-blob')
  private async processBlob (
    ctx: MeasureContext<any>,
    v: { value: any, attr: AnyAttribute },
    doc: Doc<Space>,
    indexedDoc: IndexedDoc
  ): Promise<void> {
    // We need retrieve value of attached document content.
    try {
      const ref = v.value as Ref<Blob>
      if (ref === '' || ref.startsWith('http://') || ref.startsWith('https://')) {
        return
      }
      if (v.attr.name === 'avatar' || v.attr.attributeOf === contactPlugin.class.Contact) {
        return
      }
      if (v.attr.attributeOf === attachmentPlugin.class.Attachment && v.attr.name === 'file') {
        const file = doc as Attachment
        if (!isBlobAllowed(file.type)) {
          // Skip blob with invalid, or diallowed content type
          return
        }
      }
      if (v.attr.attributeOf === drivePlugin.class.FileVersion && v.attr.name === 'file') {
        const file = doc as FileVersion
        if (!isBlobAllowed(file.type)) {
          // Skip blob with invalid, or diallowed content type
          return
        }
      }
      const docInfo: Blob | undefined = await this.storageAdapter.stat(ctx, this.workspace, ref)
      if (docInfo !== undefined && docInfo.size < 30 * 1024 * 1024) {
        // We have blob, we need to decode it to string.
        const contentType = (docInfo.contentType ?? '').split(';')[0]

        if (contentType.includes('text/') || contentType.includes('application/vnd.github.VERSION.diff')) {
          await this.handleTextBlob(ctx, docInfo, indexedDoc)
        } else if (isBlobAllowed(contentType)) {
          await this.handleBlob(ctx, docInfo, indexedDoc)
        }
      }
    } catch (err: any) {
      ctx.warn('faild to process text content', {
        id: doc._id,
        _class: doc._class,
        field: v.attr.name,
        err: err.message,
        workspace: this.workspace.uuid
      })
    }
  }

  private async handleBlob (ctx: MeasureContext<any>, docInfo: Blob | undefined, indexedDoc: IndexedDoc): Promise<void> {
    if (docInfo !== undefined) {
      const contentType = (docInfo.contentType ?? '').split(';')[0]
      const readable = await this.storageAdapter?.get(ctx, this.workspace, docInfo._id)

      if (readable !== undefined) {
        try {
          let textContent = await ctx.with('fetch', {}, () =>
            this.contentAdapter.content(ctx, this.workspace.uuid, docInfo._id, contentType, readable)
          )
          textContent = textContent
            .split(/ +|\t+|\f+/)
            .filter((it) => it)
            .join(' ')
            .split(/\n\n+/)
            .join('\n')

          indexedDoc.fulltextSummary += '\n' + textContent
        } finally {
          readable?.destroy()
        }
      }
    }
  }

  private async handleTextBlob (
    ctx: MeasureContext<any>,
    docInfo: Blob | undefined,
    indexedDoc: IndexedDoc
  ): Promise<void> {
    if (docInfo !== undefined) {
      let textContent = Buffer.concat(
        (await this.storageAdapter?.read(ctx, this.workspace, docInfo._id)) as any
      ).toString()

      textContent = textContent
        .split(/ +|\t+|\f+/)
        .filter((it) => it)
        .join(' ')
        .split(/\n\n+/)
        .join('\n')

      indexedDoc.fulltextSummary += '\n' + textContent
    }
  }
}
function isBlobAllowed (contentType: string): boolean {
  return (
    !contentType.includes('image/') &&
    !contentType.includes('video/') &&
    !contentType.includes('binary/octet-stream') &&
    !contentType.includes('application/octet-stream')
  )
}
