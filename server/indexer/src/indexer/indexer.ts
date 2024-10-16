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
import core, {
  type Class,
  DOMAIN_DOC_INDEX_STATE,
  type Doc,
  type DocIndexState,
  type DocumentQuery,
  type DocumentUpdate,
  type FullTextSearchContext,
  type Hierarchy,
  type MeasureContext,
  type ModelDb,
  type Ref,
  TxFactory,
  type WorkspaceIdWithUrl,
  _getOperator,
  docKey,
  groupByArray,
  setObjectValue,
  systemAccountEmail
} from '@hcengineering/core'
import type { DbAdapter, IndexedDoc } from '@hcengineering/server-core'
import { RateLimiter, SessionDataImpl } from '@hcengineering/server-core'
import { type FullTextPipeline, type FullTextPipelineStage } from './types'

export * from './content'
export * from './field'
export * from './types'
export * from './utils'

// Global Memory management configuration

/**
 * @public
 */
export const globalIndexer = {
  allowParallel: 2,
  processingSize: 25
}

const rateLimiter = new RateLimiter(globalIndexer.allowParallel)

let indexCounter = 0
/**
 * @public
 */
export class FullTextIndexPipeline implements FullTextPipeline {
  pending = new Map<Ref<DocIndexState>, DocumentUpdate<DocIndexState>>()
  toIndex = new Map<Ref<DocIndexState>, DocIndexState>()
  extraIndex = new Map<Ref<DocIndexState>, DocIndexState>()
  stageChanged = 0

  cancelling: boolean = false

  currentStage: FullTextPipelineStage | undefined

  readyStages: string[]

  indexing: Promise<void> | undefined

  indexId = indexCounter++

  updateTriggerTimer: any
  updateOps = new Map<Ref<DocIndexState>, DocumentUpdate<DocIndexState>>()

  uploadOps: DocIndexState[] = []

  contexts: Map<Ref<Class<Doc>>, FullTextSearchContext>
  propogage = new Map<Ref<Class<Doc>>, Ref<Class<Doc>>[]>()
  propogageClasses = new Map<Ref<Class<Doc>>, Ref<Class<Doc>>[]>()

  constructor (
    private readonly storage: DbAdapter,
    private readonly stages: FullTextPipelineStage[],
    readonly hierarchy: Hierarchy,
    readonly workspace: WorkspaceIdWithUrl,
    readonly metrics: MeasureContext,
    readonly model: ModelDb,
    readonly broadcastUpdate: (ctx: MeasureContext, classes: Ref<Class<Doc>>[]) => void
  ) {
    this.readyStages = stages.map((it) => it.stageId)
    this.readyStages.sort()
    this.contexts = new Map(model.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it]))
  }

  async cancel (): Promise<void> {
    this.cancelling = true
    clearTimeout(this.updateBroadcast)
    clearInterval(this.updateTriggerTimer)
    // We need to upload all bulk changes.
    await this.processUpload(this.metrics)
    this.triggerIndexing()
    await this.indexing
    await this.flush(true)
    this.metrics.warn('Cancel indexing', { workspace: this.workspace.name, indexId: this.indexId })
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

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    const result: IndexedDoc[] = []
    for (const st of this.stages) {
      await st.initialize(this.metrics, this.storage, this)
      const docs = await st.search(_classes, search, size, from)
      result.push(...docs.docs)
      if (!docs.pass) {
        return { docs: result, pass: false }
      }
    }
    return { docs: result, pass: true }
  }

  async flush (force = false): Promise<void> {
    if (this.pending.size > 0 && (this.pending.size >= 50 || force)) {
      // Push all pending changes to storage.
      try {
        await this.storage.update(this.metrics, DOMAIN_DOC_INDEX_STATE, this.pending)
      } catch (err: any) {
        Analytics.handleError(err)
        // Go one by one.
        for (const o of this.pending) {
          await this.storage.update(this.metrics, DOMAIN_DOC_INDEX_STATE, new Map([o]))
        }
      }
      this.pending.clear()
    }
  }

  updateDoc (doc: DocIndexState, tx: DocumentUpdate<DocIndexState>, finish: boolean): DocIndexState {
    for (const key in tx) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(doc, (tx as any)[key])
      } else {
        setObjectValue(key, doc, (tx as any)[key])
      }
    }

    const spaceKey = docKey('space', { _class: core.class.Doc })
    if (doc.attributes !== undefined && doc.attributes[spaceKey] !== undefined) {
      doc.space = doc.attributes[spaceKey]
    }

    if (finish) {
      doc.modifiedBy = core.account.System
      doc.modifiedOn = Date.now()
    }
    return doc
  }

  async processUpload (ctx: MeasureContext): Promise<void> {
    const ops = this.updateOps
    this.updateOps = new Map()
    const toUpload = this.uploadOps
    this.uploadOps = []
    if (toUpload.length > 0) {
      await ctx.with('upload', {}, async () => {
        await this.storage.upload(this.metrics, DOMAIN_DOC_INDEX_STATE, toUpload)
      })
    }
    if (ops.size > 0) {
      await ctx.with('update', {}, async () => {
        await this.storage.update(this.metrics, DOMAIN_DOC_INDEX_STATE, ops)
      })
    }
    if (toUpload.length > 0 || ops.size > 0) {
      this.triggerIndexing()
    }
  }

  async queue (
    ctx: MeasureContext,
    updates: Map<Ref<DocIndexState>, { create?: DocIndexState, updated: boolean, removed: boolean }>
  ): Promise<void> {
    const entries = Array.from(updates.entries())
    const uploads = entries.filter((it) => it[1].create !== undefined).map((it) => it[1].create) as DocIndexState[]
    if (uploads.length > 0) {
      this.uploadOps.push(...uploads)
    }

    const onlyUpdates = entries.filter((it) => it[1].create === undefined)

    if (onlyUpdates.length > 0) {
      for (const u of onlyUpdates) {
        const upd: DocumentUpdate<DocIndexState> = { removed: u[1].removed }

        // We need to clear only first state, to prevent multiple index operations to happen.
        ;(upd as any)['stages.' + this.stages[0].stageId] = false
        upd.needIndex = true
        this.updateOps.set(u[0], upd)
      }
    }
  }

  add (doc: DocIndexState): void {
    this.extraIndex.set(doc._id, doc)
  }

  // Update are commulative
  async update (
    docId: Ref<DocIndexState>,
    mark: boolean,
    update: DocumentUpdate<DocIndexState>,
    flush?: boolean
  ): Promise<void> {
    let udoc = this.toIndex.get(docId)
    if (udoc !== undefined) {
      await this.stageUpdate(udoc, update)

      udoc = this.updateDoc(udoc, update, mark)
      this.toIndex.set(docId, udoc)
    }

    if (udoc === undefined) {
      udoc = this.extraIndex.get(docId)
      if (udoc !== undefined) {
        await this.stageUpdate(udoc, update)
        udoc = this.updateDoc(udoc, update, mark)
        this.extraIndex.set(docId, udoc)
      }
    }

    if (udoc === undefined) {
      // Some updated, document, let's load it.
      udoc = (await this.storage.load(this.metrics, DOMAIN_DOC_INDEX_STATE, [docId])).shift() as DocIndexState
    }

    if (udoc !== undefined && this.currentStage !== undefined) {
      const stageId = this.currentStage.stageId
      // Update current stage, value
      update.stages = this.filterCurrentStages(udoc)
      update.stages[stageId] = mark

      if (this.currentStage.clearExcept !== undefined) {
        for (const [k] of Object.entries(update.stages)) {
          if (k !== this.currentStage.stageId && !this.currentStage.clearExcept.includes(k)) {
            update.stages[k] = false
          }
        }
      }

      // Filter unsupported stages
      udoc.stages = update.stages

      const stg = Object.values(udoc.stages)
      if (!stg.includes(false) && stg.length === this.stages.length) {
        // Check if all marks are true, we need to clear needIndex.
        udoc.needIndex = false
      }

      if (Object.keys(update).length > 0) {
        this.currentStages[stageId] = (this.currentStages[stageId] ?? 0) + 1
        this.stageChanged++
      }
    }

    const current = this.pending.get(docId)
    if (current === undefined) {
      this.pending.set(docId, update)
    } else {
      this.pending.set(docId, { ...current, ...update })
    }

    await this.flush(flush ?? false)
  }

  // Update are commulative
  async updateNeedIndex (docId: Ref<DocIndexState>, value: boolean, flush?: boolean): Promise<void> {
    const update = { needIndex: value }
    let udoc = this.toIndex.get(docId)
    if (udoc !== undefined) {
      await this.stageUpdate(udoc, update)

      udoc = this.updateDoc(udoc, update, true)
      this.toIndex.set(docId, udoc)
    }

    if (udoc === undefined) {
      udoc = this.extraIndex.get(docId)
      if (udoc !== undefined) {
        await this.stageUpdate(udoc, update)
        udoc = this.updateDoc(udoc, update, true)
        this.extraIndex.set(docId, udoc)
      }
    }

    if (udoc === undefined) {
      // Some updated, document, let's load it.
      udoc = (await this.storage.load(this.metrics, DOMAIN_DOC_INDEX_STATE, [docId])).shift() as DocIndexState
    }

    const current = this.pending.get(docId)
    if (current === undefined) {
      this.pending.set(docId, update)
    } else {
      this.pending.set(docId, { ...current, ...update })
    }

    await this.flush(flush ?? false)
  }

  triggerCounts = 0

  triggerIndexing = (): void => {}
  currentStages: Record<string, number> = {}

  private filterCurrentStages (udoc: DocIndexState): Record<string, boolean> {
    const result: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(udoc.stages ?? {})) {
      if (this.currentStages[k] !== undefined) {
        result[k] = v
      }
    }
    return result
  }

  private async stageUpdate (udoc: DocIndexState, update: DocumentUpdate<DocIndexState>): Promise<void> {
    for (const u of this.currentStage?.updateFields ?? []) {
      await u(udoc, update)
    }
  }

  async startIndexing (): Promise<void> {
    this.indexing = this.doIndexing()

    clearTimeout(this.updateTriggerTimer)
    this.updateTriggerTimer = setInterval(() => {
      void this.processUpload(this.metrics)
    }, 250)
  }

  async initializeStages (): Promise<void> {
    for (const st of this.stages) {
      if (this.cancelling) {
        return
      }
      await st.initialize(this.metrics, this.storage, this)
    }
  }

  broadcastClasses = new Set<Ref<Class<Doc>>>()
  updateBroadcast: any = undefined

  async doIndexing (): Promise<void> {
    // Check model is upgraded to support indexer.

    await this.metrics.with('init-states', {}, async () => {
      await this.initStates()
    })

    while (!this.cancelling) {
      // Clear triggers
      this.triggerCounts = 0
      this.stageChanged = 0
      await this.metrics.with('initialize-stages', { workspace: this.workspace.name }, async () => {
        await this.initializeStages()
      })

      const _classes = await this.metrics.with(
        'processIndex',
        { workspace: this.workspace.name },
        async (ctx) => await this.processIndex(ctx)
      )

      // Also update doc index state queries.
      _classes.forEach((it) => this.broadcastClasses.add(it))

      if (this.triggerCounts > 0) {
        this.metrics.info('No wait, trigger counts', { triggerCount: this.triggerCounts })
      }

      if (this.toIndex.size === 0 && this.stageChanged === 0 && this.triggerCounts === 0) {
        if (this.toIndex.size === 0) {
          this.metrics.warn('Indexing complete', { indexId: this.indexId, workspace: this.workspace.name })
        }
        if (!this.cancelling) {
          // We need to send index update event
          clearTimeout(this.updateBroadcast)
          this.updateBroadcast = setTimeout(() => {
            this.broadcastClasses.delete(core.class.DocIndexState)
            if (this.broadcastClasses.size > 0) {
              const toSend = Array.from(this.broadcastClasses.values())
              this.broadcastClasses.clear()
              this.broadcastUpdate(this.metrics, toSend)
            }
          }, 5000)

          let notified = false
          await new Promise((resolve) => {
            this.triggerIndexing = () => {
              this.triggerCounts++
              if (!notified) {
                notified = true
                setTimeout(() => {
                  resolve(null)
                }, 500) // Start indexing only after cooldown
              }
            }
          })
        }
      }
    }
    this.metrics.warn('Exit indexer', { indexId: this.indexId, workspace: this.workspace.name })
  }

  private async processIndex (ctx: MeasureContext): Promise<Ref<Class<Doc>>[]> {
    const _classUpdate = new Set<Ref<Class<Doc>>>()
    await rateLimiter.exec(async () => {
      while (true) {
        try {
          if (this.cancelling) {
            return Array.from(_classUpdate.values())
          }
          await ctx.with('flush', {}, async () => {
            await this.flush(true)
          })

          let result: DocIndexState[] | undefined = await ctx.with('get-indexable', {}, async () => {
            return await this.storage.findAll(
              ctx,
              core.class.DocIndexState,
              {
                needIndex: true
              },
              {
                limit: globalIndexer.processingSize,
                skipClass: true,
                skipSpace: true
              }
            )
          })
          if (result === undefined) {
            // No more results
            break
          }

          await this.processRemove(result)
          result = result.filter((it) => !it.removed)
          const toRemove: DocIndexState[] = []
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

          if (result.length > 0) {
            this.metrics.info('Full text: Indexing', {
              indexId: this.indexId,
              workspace: this.workspace.name,
              ...this.currentStages
            })
          } else {
            // Nothing to index, check on next cycle.
            break
          }
          const retry: DocIndexState[] = []

          await this.processStages(result, ctx, _classUpdate)

          // Force clear needIndex, it will be re trigger if some propogate will happen next.
          if (!this.cancelling) {
            for (const u of result) {
              const stg = Object.values(u.stages)
              if (!stg.includes(false) && stg.length === this.stages.length) {
                // Check if all marks are true, we need to clear needIndex.
                u.needIndex = false
                await this.updateNeedIndex(u._id, false)
              } else {
                // Mark as retry on
                retry.push(u)
              }
            }
          }
          if (retry.length > 0) {
            await this.processStages(retry, ctx, _classUpdate)
            if (!this.cancelling) {
              for (const u of retry) {
                // Since retry is happen, it shoudl be marked already.
                u.needIndex = false
                await this.updateNeedIndex(u._id, false)
              }
            }
          }
        } catch (err: any) {
          Analytics.handleError(err)
          this.metrics.error('error during index', { error: err })
        }
      }
    })
    return Array.from(_classUpdate.values())
  }

  private async processStages (
    result: DocIndexState[],
    ctx: MeasureContext,
    _classUpdate: Set<Ref<Class<Doc>>>
  ): Promise<void> {
    this.toIndex = new Map(result.map((it) => [it._id, it]))
    const contextData = new SessionDataImpl(
      systemAccountEmail,
      '',
      true,
      { targets: {}, txes: [] },
      this.workspace,
      null,
      false,
      new Map(),
      new Map(),
      this.model
    )
    ctx.contextData = contextData
    for (const st of this.stages) {
      this.extraIndex.clear()
      this.stageChanged = 0
      // Find documents matching query
      const toIndex = this.matchStates(st)

      if (toIndex.length > 0) {
        // Do Indexing
        this.currentStage = st

        await ctx.with('collect-' + st.stageId, {}, async (ctx) => {
          await st.collect(toIndex, this, ctx)
        })
        if (this.cancelling) {
          break
        }

        toIndex.forEach((it) => _classUpdate.add(it.objectClass))
      } else {
        continue
      }
    }
  }

  private async processRemove (docs: DocIndexState[]): Promise<void> {
    let total = 0
    this.toIndex = new Map(docs.map((it) => [it._id, it]))

    this.extraIndex.clear()

    const toIndex = Array.from(this.toIndex.values()).filter((it) => it.removed)
    if (toIndex.length === 0) {
      return
    }
    const toRemoveIds = []
    for (const st of this.stages) {
      if (toIndex.length > 0) {
        // Do Indexing
        this.currentStage = st
        await st.remove(toIndex, this)
      } else {
        break
      }
    }
    // If all stages are complete, remove document
    const allStageIds = this.stages.map((it) => it.stageId)
    for (const doc of toIndex) {
      if (allStageIds.every((it) => doc.stages[it])) {
        toRemoveIds.push(doc._id)
      }
    }

    await this.flush(true)
    if (toRemoveIds.length > 0) {
      await this.storage.clean(this.metrics, DOMAIN_DOC_INDEX_STATE, toRemoveIds)
      total += toRemoveIds.length
      this.metrics.info('indexer', {
        _classes: Array.from(groupByArray(toIndex, (it) => it.objectClass).keys()),
        total,
        count: toRemoveIds.length
      })
    }
  }

  private async initStates (): Promise<void> {
    this.currentStages = {}
    for (const st of this.stages) {
      this.currentStages[st.stageId] = 0
    }
  }

  private matchStates (st: FullTextPipelineStage): DocIndexState[] {
    const toIndex: DocIndexState[] = []
    const require = [...st.require].filter((it) => this.stages.find((q) => q.stageId === it && q.enabled))
    for (const o of this.toIndex.values()) {
      // We need to contain all state values
      if (require.every((it) => o.stages?.[it]) && !(o.stages?.[st.stageId] ?? false)) {
        toIndex.push(o)
      }
    }
    return toIndex
  }
}
