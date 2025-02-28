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
  DOMAIN_DOC_INDEX_STATE,
  DOMAIN_MIGRATION,
  type Doc,
  type DocIndexState,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindResult,
  type FullTextSearchContext,
  type Hierarchy,
  type IdMap,
  type MeasureContext,
  type MigrationState,
  type ModelDb,
  type Ref,
  type Space,
  TxFactory,
  type WithLookup,
  coreId,
  type WorkspaceIds,
  docKey,
  generateId,
  getFullTextIndexableAttributes,
  groupByArray,
  isClassIndexable,
  isFullTextAttribute,
  isIndexedAttribute,
  toIdMap,
  withContext,
  systemAccount,
  type WorkspaceUuid
} from '@hcengineering/core'
import drivePlugin, { type FileVersion } from '@hcengineering/drive'
import type {
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
import { createIndexedDoc, createStateDoc, getContent } from './utils'

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

const rateLimiter = new RateLimiter(globalIndexer.allowParallel)

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
/**
 * @public
 */
export class FullTextIndexPipeline implements FullTextPipeline {
  cancelling: boolean = false
  indexing: Promise<void> | undefined
  verify: Promise<void> | undefined

  indexId = indexCounter++

  contexts: Map<Ref<Class<Doc>>, FullTextSearchContext>

  byDomain = new Map<Domain, Ref<Class<Doc>>[]>()

  constructor (
    readonly fulltextAdapter: FullTextAdapter,
    private readonly storage: DbAdapter,
    readonly hierarchy: Hierarchy,
    readonly workspace: WorkspaceIds,
    readonly metrics: MeasureContext,
    readonly model: ModelDb,
    readonly storageAdapter: StorageAdapter,
    readonly contentAdapter: ContentTextAdapter,
    readonly broadcastUpdate: (ctx: MeasureContext, classes: Ref<Class<Doc>>[]) => void,
    readonly checkIndexes: () => Promise<void>
  ) {
    this.contexts = new Map(model.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it]))
  }

  async cancel (): Promise<void> {
    this.cancelling = true
    await this.verify
    this.triggerIndexing()
    await this.indexing
    this.metrics.warn('Cancel indexing', { workspace: this.workspace.uuid, indexId: this.indexId })
  }

  async markRemove (doc: DocIndexState): Promise<void> {
    const ops = new TxFactory(core.account.System, true)
    await this.storage.tx(
      this.metrics,
      ops.createTxUpdateDoc(doc._class, doc.space, doc._id, {
        removed: true,
        needIndex: true
      })
    )
  }

  updateDoc (doc: DocIndexState, tx: DocumentUpdate<DocIndexState>, finish: boolean): DocIndexState {
    if (finish) {
      doc.needIndex = false
      doc.modifiedBy = core.account.System
      doc.modifiedOn = Date.now()
    }
    return doc
  }

  triggerCounts = 0

  triggerIndexing = (): void => {}

  async startIndexing (indexing: () => void): Promise<void> {
    this.cancelling = false
    this.verify = this.verifyWorkspace(this.metrics, indexing)
    void this.verify.then(() => {
      this.indexing = this.doIndexing(indexing)
    })
  }

  @withContext('verify-workspace')
  async verifyWorkspace (ctx: MeasureContext, indexing: () => void): Promise<void> {
    // We need to apply migrations if required.
    const migrations = await this.storage.findAll<MigrationState>(ctx, core.class.MigrationState, {
      plugin: coreId
    })

    // Verify class integrity if required
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

    this.byDomain = groupByArray(allIndexed, (it) => this.hierarchy.getDomain(it))
    this.byDomain = new Map(
      Array.from(this.byDomain.entries()).sort((a, b) => {
        const ap = domainPriorities[a[0]] ?? 0
        const bp = domainPriorities[b[0]] ?? 0
        return bp - ap
      })
    )

    const indexes = 'verify-indexes-v2'
    if (migrations.find((it) => it.state === indexes) === undefined) {
      ctx.warn('Rebuild DB index', { workspace: this.workspace.uuid })
      // Clean all existing docs, they will be re-created on verify stage
      await this.checkIndexes()

      await this.addMigration(ctx, indexes)
      ctx.warn('Rebuild DB index complete', { workspace: this.workspace.uuid })
    }

    const fullReindex = 'full-text-indexer-v5'
    if (migrations.find((it) => it.state === fullReindex) === undefined) {
      ctx.warn('rebuilding index to v5', { workspace: this.workspace.uuid })
      // Clean all existing docs, they will be re-created on verify stage
      await this.storage.rawDeleteMany<DocIndexState>(DOMAIN_DOC_INDEX_STATE, {})
      if (this.workspace.dataId != null) {
        await this.fulltextAdapter.clean(ctx, this.workspace.dataId as unknown as WorkspaceUuid)
      }
      await this.fulltextAdapter.clean(ctx, this.workspace.uuid)
      ctx.warn('rebuilding index to v5 complete', { workspace: this.workspace.uuid })

      await this.addMigration(ctx, fullReindex)
    }

    const docStructure = 'full-text-structure-v5'
    if (migrations.find((it) => it.state === docStructure) === undefined) {
      ctx.warn('verify document structure', { version: docStructure, workspace: this.workspace.uuid })

      for (const [domain, classes] of this.byDomain.entries()) {
        await ctx.with('verify-domain', { domain }, async () => {
          // Iterate over all domain documents and add appropriate entries
          const allDocs = await this.storage.rawFindAll(
            domain,
            { _class: { $in: classes } },
            { projection: { _class: 1, _id: 1 } }
          )
          try {
            let processed = 0
            while (true) {
              indexing()
              const docs = allDocs.splice(0, 1000)
              if (docs.length === 0) {
                break
              }
              const states = toIdMap(
                await this.storage.rawFindAll(
                  DOMAIN_DOC_INDEX_STATE,
                  { _id: { $in: docs.map((it) => it._id) } },
                  {
                    projection: { _id: 1 }
                  }
                )
              )
              // Find missing documents
              const missingDocs = docs
                .filter((it) => !states.has(it._id))
                .map((it) => createStateDoc(it._id, it._class, { needIndex: true, removed: false }))

              if (missingDocs.length > 0) {
                await this.storage.upload(ctx, DOMAIN_DOC_INDEX_STATE, missingDocs)
              }
              processed += docs.length
              ctx.info('processed', { processed, allDocs: allDocs.length, domain })
            }
          } catch (err: any) {
            ctx.error('failed to restore index state', { err })
          }
        })
      }
      // Mark missing classes as deleted ones.
      await this.storage.rawUpdate<DocIndexState>(
        DOMAIN_DOC_INDEX_STATE,
        { objectClass: { $nin: allIndexed } },
        {
          removed: true,
          needIndex: true
        }
      )
      await this.addMigration(ctx, docStructure)
    }
  }

  async clearIndex (onlyDrop = false): Promise<void> {
    if (!onlyDrop) {
      const ctx = this.metrics
      const migrations = await this.storage.findAll<MigrationState>(ctx, core.class.MigrationState, {
        plugin: coreId,
        state: {
          $in: ['verify-indexes-v2', 'full-text-indexer-v5', 'full-text-structure-v4']
        }
      })

      const refs = migrations.map((it) => it._id)
      await this.storage.clean(ctx, DOMAIN_MIGRATION, refs)
    } else {
      if (this.workspace.dataId != null) {
        await this.fulltextAdapter.clean(this.metrics, this.workspace.dataId as unknown as WorkspaceUuid)
      }
      await this.fulltextAdapter.clean(this.metrics, this.workspace.uuid)
    }
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

  async doIndexing (indexing: () => void): Promise<void> {
    while (!this.cancelling) {
      // Clear triggers
      this.triggerCounts = 0

      const { classUpdate: _classes, processed } = await this.metrics.with(
        'processIndex',
        { workspace: this.workspace.uuid },
        (ctx) => this.processIndex(ctx, indexing)
      )

      // Also update doc index state queries.
      _classes.forEach((it) => this.broadcastClasses.add(it))

      if (this.triggerCounts > 0) {
        this.metrics.info('No wait, trigger counts', { triggerCount: this.triggerCounts })
      }

      if (this.triggerCounts === 0) {
        if (processed > 0) {
          this.metrics.warn('Indexing complete', { indexId: this.indexId, workspace: this.workspace.uuid, processed })
        }
        if (!this.cancelling) {
          // We need to send index update event
          if (this.broadcasts === 0) {
            this.broadcasts++
            setTimeout(() => {
              this.broadcasts = 0
              this.broadcastClasses.delete(core.class.DocIndexState)
              if (this.broadcastClasses.size > 0) {
                const toSend = Array.from(this.broadcastClasses.values())
                this.broadcastClasses.clear()
                this.broadcastUpdate(this.metrics, toSend)
              }
            }, 5000)
          }

          await new Promise((resolve) => {
            this.triggerIndexing = () => {
              this.triggerCounts++
              resolve(null)
            }
          })
        }
      }
    }
    this.metrics.warn('Exit indexer', { indexId: this.indexId, workspace: this.workspace.uuid })
  }

  async indexDocuments (
    ctx: MeasureContext,
    docs: {
      _class: Ref<Class<Doc>>
      _id: Ref<Doc>
    }[]
  ): Promise<void> {
    const parts = [...docs]
    while (parts.length > 0) {
      const part = parts.splice(0, 50)

      const states = toIdMap(
        await this.storage.findAll(
          ctx,
          core.class.DocIndexState,
          { _id: { $in: part.map((it) => it._id as Ref<DocIndexState>) } },
          { projection: { _id: 1 } }
        )
      )

      const toInsert: DocIndexState[] = []
      const toUpdate: Ref<DocIndexState>[] = []
      for (const p of part) {
        if (states.has(p._id as Ref<DocIndexState>)) {
          toUpdate.push(p._id as Ref<DocIndexState>)
        } else {
          // Space will be updated on indexing
          toInsert.push(
            createStateDoc(p._id, p._class, {
              needIndex: true,
              removed: false
            })
          )
        }
      }
      if (toInsert.length > 0) {
        await this.storage.upload(ctx, DOMAIN_DOC_INDEX_STATE, toInsert)
      }
      if (toUpdate.length > 0) {
        await this.storage.rawUpdate<DocIndexState>(
          DOMAIN_DOC_INDEX_STATE,
          { _id: { $in: toUpdate } },
          { needIndex: true }
        )
      }
    }
    this.triggerIndexing()
  }

  private async processIndex (
    ctx: MeasureContext,
    indexing: () => void
  ): Promise<{ classUpdate: Ref<Class<Doc>>[], processed: number }> {
    const _classUpdate = new Set<Ref<Class<Doc>>>()
    let processed = 0
    await rateLimiter.exec(async () => {
      let st = Date.now()

      let groupBy = await this.storage.groupBy(ctx, DOMAIN_DOC_INDEX_STATE, 'objectClass', { needIndex: true })
      const total = Array.from(groupBy.values()).reduce((a, b) => a + b, 0)
      while (true) {
        try {
          if (this.cancelling) {
            return Array.from(_classUpdate.values())
          }
          const q: DocumentQuery<DocIndexState> = {
            needIndex: true
          }
          let domainLookup: Domain | undefined
          // set a class for more priority domains if they have documents
          for (const [domain, classes] of this.byDomain.entries()) {
            // Calc if we have classes pending for this domain.
            const pending = classes.filter((it) => (groupBy.get(it) ?? 0) > 0)
            if (pending.length > 0) {
              // We have some classes pending indexing in this domain.
              q.objectClass = { $in: pending }
              domainLookup = domain
              break
            }
          }
          if (domainLookup === undefined) {
            // Nothing to index, we should remove pending needIndex requests, since they are not required anymore
            if (Array.from(groupBy.values()).reduce((a, b) => a + b, 0) > 0) {
              await this.storage.rawDeleteMany<DocIndexState>(DOMAIN_DOC_INDEX_STATE, {
                needIndex: true,
                objectClass: { $in: Array.from(groupBy.keys()) as Ref<Class<Doc>>[] }
              })
            }
            break
          }

          let result: FindResult<DocIndexState> | WithLookup<DocIndexState>[] = await ctx.with(
            'get-indexable',
            {},
            (ctx) => {
              return this.storage.findAll(ctx, core.class.DocIndexState, q, {
                limit: globalIndexer.processingSize,
                skipClass: true,
                skipSpace: true,
                domainLookup: {
                  field: '_id',
                  domain: domainLookup
                }
              })
            }
          )
          if (result.length === 0) {
            if (q.objectClass !== undefined) {
              // If we searched with objectClass, we need to recalculate groupBy
              groupBy = await this.storage.groupBy(ctx, DOMAIN_DOC_INDEX_STATE, 'objectClass', { needIndex: true })
              continue
            }
            // No more results
            break
          }

          indexing() // Update no sleep

          for (const r of result) {
            if (typeof r._id === 'object') {
              r._id = (r._id as any).toString()
            }
            const p = groupBy.get(r.objectClass)
            if (p !== undefined) {
              if (p - 1 === 0) {
                groupBy.delete(r.objectClass)
              } else {
                groupBy.set(r.objectClass, p - 1)
              }
            }
          }

          const toRemove: DocIndexState[] = await this.processRemove(ctx, result)
          result = result.filter((it) => !it.removed)
          // Check and remove missing class documents.
          result = result.filter((doc) => {
            const _class = this.model.findObject(doc.objectClass)
            if (_class === undefined) {
              // no _class present, remove doc
              toRemove.push(doc)
              return false
            }
            return true
          })

          if (toRemove.length > 0) {
            try {
              await this.storage.clean(
                this.metrics,
                DOMAIN_DOC_INDEX_STATE,
                toRemove.map((it) => it._id)
              )
            } catch (err: any) {
              Analytics.handleError(err)
              // QuotaExceededError, ignore
            }
          }

          await this.processDocuments(result, ctx, _classUpdate)
          processed += result.length
          if (Date.now() - st > 5000) {
            st = Date.now()
            this.metrics.info('Full text: Indexing', {
              indexId: this.indexId,
              workspace: this.workspace.uuid,
              domain: domainLookup,
              processed,
              total
            })
          }
        } catch (err: any) {
          Analytics.handleError(err)
          this.metrics.error('error during index', { error: err })
        }
      }
    })
    return { classUpdate: Array.from(_classUpdate.values()), processed }
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

  private async processDocuments (
    result: WithLookup<DocIndexState>[],
    ctx: MeasureContext,
    _classUpdate: Set<Ref<Class<Doc>>>
  ): Promise<void> {
    const contextData = this.createContextData()
    ctx.contextData = contextData
    let indexedDocs: IndexedDoc[] = []
    // Find documents matching query

    const byClass = groupByArray<WithLookup<DocIndexState>, Ref<Class<Doc>>>(result, (it) => it.objectClass)

    const docUpdates = new Map<Ref<Doc>, Partial<DocIndexState>>()

    const pushQueue = new RateLimiter(5)

    const pushToIndex = async (): Promise<void> => {
      const docs = [...indexedDocs]
      indexedDocs = []
      if (docs.length === 0) {
        return
      }
      await pushQueue.add(async () => {
        try {
          try {
            await ctx.with('push-elastic', {}, () => this.fulltextAdapter.updateMany(ctx, this.workspace.uuid, docs))
          } catch (err: any) {
            Analytics.handleError(err)
            // Try to push one by one
            await ctx.with('push-elastic-by-one', {}, async () => {
              for (const d of docs) {
                try {
                  await this.fulltextAdapter.update(ctx, this.workspace.uuid, d.id, d)
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

    let spaceDocs: IdMap<Space> | undefined
    const updateSpaces = async (): Promise<void> => {
      spaceDocs = toIdMap(
        await ctx.with('find-spaces', {}, (ctx) =>
          this.storage.findAll(
            ctx,
            core.class.Space,
            {
              _id: {
                $in: Array.from(new Set(result.map((doc) => doc.space)))
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

    const rateLimit = new RateLimiter(10)

    for (const [v, values] of byClass.entries()) {
      const searchPresenter = findSearchPresenter(this.hierarchy, v)
      // Obtain real documents
      const valueIds = new Map(values.map((it) => [it._id, it]))
      const docs = values.map((it) => it.$lookup?._id as Doc).filter((it) => it !== undefined)
      let parentDocs: IdMap<Doc> | undefined

      // We need to add all to broadcast update
      for (const doc of docs) {
        if (typeof doc._id === 'object') {
          doc._id = (doc._id as any).toString()
        }
        _classUpdate.add(doc._class)
        if (this.cancelling) {
          return
        }
        const docState = valueIds.get(doc._id as Ref<DocIndexState>) as WithLookup<DocIndexState>
        const indexedDoc = createIndexedDoc(doc, this.hierarchy.findAllMixins(doc), doc.space)

        await rateLimit.add(async () => {
          await ctx.with('process-document', { _class: doc._class }, async (ctx) => {
            try {
              // Copy content attributes as well.
              const docUpdate: DocumentUpdate<DocIndexState> = {
                needIndex: false
              }
              if (docState.space !== doc.space) {
                docUpdate.space = doc.space
              }

              // TODO: Check if need to include parent values here as well

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
                    parentDocs = this.hierarchy.isDerived(v, core.class.AttachedDoc)
                      ? await this.findParents(ctx, docs as unknown as AttachedDoc[])
                      : undefined
                  }
                  const parentDoc = parentDocs?.get((doc as AttachedDoc).attachedTo as Ref<DocIndexState>)
                  if (spaceDocs === undefined) {
                    await updateSpaces()
                  }
                  const spaceDoc = spaceDocs?.get(doc.space) // docState.$lookup?.space
                  await updateDocWithPresenter(this.hierarchy, doc, indexedDoc, parentDoc, spaceDoc, searchPresenter)
                })
              }

              indexedDoc.id = doc._id
              indexedDoc.space = doc.space
              indexedDocs.push(indexedDoc)

              if (indexedDocs.length > 25) {
                void pushToIndex()
              }

              docUpdates.set(docState._id, docUpdate)
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
    }
    await rateLimit.waitProcessing()

    await pushToIndex()
    await pushQueue.waitProcessing()

    await ctx.with('update-index-state', {}, (ctx) =>
      this.storage.rawUpdate(DOMAIN_DOC_INDEX_STATE, DOMAIN_DOC_INDEX_STATE, docUpdates)
    )
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
        const markup = readable.toString()
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
        err,
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
      let textContent = (await this.storageAdapter?.read(ctx, this.workspace, docInfo._id)).toString()

      textContent = textContent
        .split(/ +|\t+|\f+/)
        .filter((it) => it)
        .join(' ')
        .split(/\n\n+/)
        .join('\n')

      indexedDoc.fulltextSummary += '\n' + textContent
    }
  }

  private async processRemove (ctx: MeasureContext, docs: DocIndexState[]): Promise<DocIndexState[]> {
    try {
      const toRemove = docs.filter((it) => it.removed)
      if (toRemove.length !== 0) {
        await this.fulltextAdapter.remove(
          ctx,
          this.workspace.uuid,
          toRemove.map((it) => it._id)
        )
      }
      return toRemove
    } catch (err: any) {
      Analytics.handleError(err)
    }
    return []
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
