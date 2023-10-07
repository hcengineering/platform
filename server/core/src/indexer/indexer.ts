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

import core, {
  AttachedDoc,
  Class,
  DOMAIN_DOC_INDEX_STATE,
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  Hierarchy,
  MeasureContext,
  ModelDb,
  Ref,
  ServerStorage,
  TxFactory,
  WorkspaceId,
  _getOperator,
  setObjectValue,
  toFindResult,
  versionToString
} from '@hcengineering/core'
import { DbAdapter } from '../adapter'
import { RateLimitter } from '../limitter'
import type { IndexedDoc } from '../types'
import { FullTextPipeline, FullTextPipelineStage } from './types'
import { createStateDoc, isClassIndexable } from './utils'

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
  processingSize: 1000
}

const rateLimitter = new RateLimitter(() => ({ rate: globalIndexer.allowParallel }))

let indexCounter = 0
/**
 * @public
 */
export class FullTextIndexPipeline implements FullTextPipeline {
  pending: Map<Ref<DocIndexState>, DocumentUpdate<DocIndexState>> = new Map()
  toIndex: Map<Ref<DocIndexState>, DocIndexState> = new Map()
  extraIndex: Map<Ref<DocIndexState>, DocIndexState> = new Map()
  stageChanged = 0

  cancelling: boolean = false

  currentStage: FullTextPipelineStage | undefined

  readyStages: string[]

  indexing: Promise<void> | undefined

  // Temporary skipped items
  skipped = new Map<Ref<DocIndexState>, number>()

  indexId = indexCounter++

  constructor (
    private readonly storage: DbAdapter,
    private readonly stages: FullTextPipelineStage[],
    readonly hierarchy: Hierarchy,
    readonly workspace: WorkspaceId,
    readonly metrics: MeasureContext,
    readonly model: ModelDb,
    readonly broadcastUpdate: (classes: Ref<Class<Doc>>[]) => void
  ) {
    this.readyStages = stages.map((it) => it.stageId)
    this.readyStages.sort()
  }

  async cancel (): Promise<void> {
    console.log(this.workspace.name, 'Cancel indexing', this.indexId)
    this.cancelling = true
    clearTimeout(this.skippedReiterationTimeout)
    this.triggerIndexing()
    await this.indexing
    await this.flush(true)
    console.log(this.workspace.name, 'Indexing canceled', this.indexId)
  }

  async markRemove (doc: DocIndexState): Promise<void> {
    const ops = new TxFactory(core.account.System, true)
    await this.storage.tx(
      ops.createTxUpdateDoc(doc._class, doc.space, doc._id, {
        removed: true
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
      await st.initialize(this.storage, this)
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
        await this.storage.update(DOMAIN_DOC_INDEX_STATE, this.pending)
      } catch (err: any) {
        console.error(err)
        // Go one by one.
        for (const o of this.pending) {
          await this.storage.update(DOMAIN_DOC_INDEX_STATE, new Map([o]))
        }
      }
      this.pending.clear()
    }
  }

  updateDoc<T extends Doc>(doc: T, tx: DocumentUpdate<T>, updateDate: boolean): T {
    for (const key in tx) {
      if (key.startsWith('$')) {
        const operator = _getOperator(key)
        operator(doc, (tx as any)[key])
      } else {
        setObjectValue(key, doc, (tx as any)[key])
      }
    }
    if (updateDate) {
      doc.modifiedBy = core.account.System
      doc.modifiedOn = Date.now()
    }
    return doc
  }

  async queue (docId: Ref<DocIndexState>, create: boolean, removed: boolean, doc?: DocIndexState): Promise<void> {
    if (doc !== undefined) {
      await this.storage.upload(DOMAIN_DOC_INDEX_STATE, [doc])
    }

    if (!create) {
      const ops = new Map<Ref<DocIndexState>, DocumentUpdate<DocIndexState>>()
      const upd: DocumentUpdate<DocIndexState> = { removed }
      for (const st of this.stages) {
        ;(upd as any)['stages.' + st.stageId] = false
      }
      ops.set(docId, upd)
      await this.storage.update(DOMAIN_DOC_INDEX_STATE, ops)
    }
    this.triggerIndexing()
  }

  add (doc: DocIndexState): void {
    this.extraIndex.set(doc._id, doc)
  }

  // Update are commulative
  async update (
    docId: Ref<DocIndexState>,
    mark: boolean | string,
    update: DocumentUpdate<DocIndexState>,
    flush?: boolean
  ): Promise<void> {
    let udoc = this.toIndex.get(docId)
    if (udoc !== undefined) {
      await this.stageUpdate(udoc, update)

      udoc = this.updateDoc(udoc, update, mark !== false)
      this.toIndex.set(docId, udoc)
    }

    if (udoc === undefined) {
      udoc = this.extraIndex.get(docId)
      if (udoc !== undefined) {
        await this.stageUpdate(udoc, update)
        udoc = this.updateDoc(udoc, update, mark !== false)
        this.extraIndex.set(docId, udoc)
      }
    }

    if (udoc === undefined) {
      // Some updated, document, let's load it.
      udoc = (await this.storage.load(DOMAIN_DOC_INDEX_STATE, [docId])).shift() as DocIndexState
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

  triggerIndexing = (): void => {}
  skippedReiterationTimeout: any
  currentStages: Record<string, number> = {}

  private filterCurrentStages (udoc: DocIndexState): Record<string, string | boolean> {
    const result: Record<string, string | boolean> = {}
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
  }

  async initializeStages (): Promise<void> {
    for (const st of this.stages) {
      await st.initialize(this.storage, this)
    }
  }

  broadcastClasses = new Set<Ref<Class<Doc>>>()
  updateBroadcast: any = undefined

  indexesCreated = false

  async doIndexing (): Promise<void> {
    // Check model is upgraded to support indexer.

    if (!this.indexesCreated) {
      this.indexesCreated = true
      // We need to be sure we have individual indexes per stage.
      for (const st of this.stages) {
        await this.storage.createIndexes(DOMAIN_DOC_INDEX_STATE, {
          indexes: [
            {
              ['stages.' + st.stageId]: 1
            },
            {
              _class: 1,
              _id: 1,
              ['stages.' + st.stageId]: 1,
              removed: 1
            }
          ]
        })
      }
    }

    try {
      this.hierarchy.getClass(core.class.DocIndexState)
    } catch (err: any) {
      console.log(this.workspace.name, 'Models is not upgraded to support indexer', this.indexId)
      return
    }
    await this.metrics.with('init-states', {}, async () => await this.initStates())

    while (!this.cancelling) {
      await this.metrics.with('initialize-stages', {}, async () => await this.initializeStages())

      await this.metrics.with('process-remove', {}, async () => await this.processRemove())

      const _classes = await rateLimitter.exec(() => {
        return this.metrics.with('init-stages', {}, async () => await this.processIndex())
      })

      // Also update doc index state queries.
      _classes.push(core.class.DocIndexState)

      _classes.forEach((it) => this.broadcastClasses.add(it))

      if (this.toIndex.size === 0 || this.stageChanged === 0) {
        if (this.toIndex.size === 0) {
          console.log(this.workspace.name, 'Indexing complete', this.indexId)
        }
        if (!this.cancelling) {
          // We need to send index update event
          clearTimeout(this.updateBroadcast)
          this.updateBroadcast = setTimeout(() => {
            this.broadcastUpdate(Array.from(this.broadcastClasses.values()))
            this.broadcastClasses.clear()
          }, 5000)

          await new Promise((resolve) => {
            this.triggerIndexing = () => {
              resolve(null)
              clearTimeout(this.skippedReiterationTimeout)
            }
            this.skippedReiterationTimeout = setTimeout(() => {
              // Force skipped reiteration, just decrease by -1
              for (const [s, v] of Array.from(this.skipped.entries())) {
                this.skipped.set(s, v - 1)
              }
            }, 60000)
          })
        }
      }
    }
    console.log(this.workspace.name, 'Exit indexer', this.indexId)
  }

  private async processIndex (): Promise<Ref<Class<Doc>>[]> {
    let idx = 0
    const _classUpdate = new Set<Ref<Class<Doc>>>()
    for (const st of this.stages) {
      idx++
      while (true) {
        try {
          if (this.cancelling) {
            return Array.from(_classUpdate.values())
          }
          if (!st.enabled) {
            break
          }
          await this.metrics.with('flush', {}, async () => await this.flush(true))
          const toSkip = Array.from(this.skipped.entries())
            .filter((it) => it[1] > 3)
            .map((it) => it[0])

          let result = await this.metrics.with(
            'get-to-index',
            {},
            async () =>
              await this.storage.findAll(
                core.class.DocIndexState,
                {
                  [`stages.${st.stageId}`]: { $ne: st.stageValue },
                  _id: { $nin: toSkip },
                  removed: false
                },
                {
                  limit: globalIndexer.processingSize,
                  sort: {
                    _id: 1
                  }
                }
              )
          )
          const toRemove: DocIndexState[] = []
          // Check and remove missing class documents.
          result = toFindResult(
            result.filter((doc) => {
              const _class = this.model.findObject(doc.objectClass)
              if (_class === undefined) {
                // no _class present, remove doc
                toRemove.push(doc)
                return false
              }
              return true
            }),
            result.total
          )

          if (toRemove.length > 0) {
            try {
              await this.storage.clean(
                DOMAIN_DOC_INDEX_STATE,
                toRemove.map((it) => it._id)
              )
            } catch (err: any) {
              // QuotaExceededError, ignore
            }
          }

          if (result.length > 0) {
            console.log(
              this.workspace.name,
              `Full text: Indexing ${this.indexId} ${st.stageId}`,
              Object.entries(this.currentStages)
                .map((it) => `${it[0]}:${it[1]}`)
                .join(' '),
              result.total
            )
          } else {
            // Nothing to index, check on next cycle.
            break
          }

          this.toIndex = new Map(result.map((it) => [it._id, it]))

          this.extraIndex.clear()
          this.stageChanged = 0
          // Find documents matching query
          const toIndex = this.matchStates(st)

          if (toIndex.length > 0) {
            // Do Indexing
            this.currentStage = st

            await this.metrics.with(
              'collect',
              { collector: st.stageId },
              async (ctx) => await st.collect(toIndex, this, ctx)
            )
            if (this.cancelling) {
              break
            }

            toIndex.forEach((it) => _classUpdate.add(it.objectClass))

            // go with next stages if they accept it
            for (const nst of this.stages.slice(idx)) {
              const toIndex2 = this.matchStates(nst)
              if (toIndex2.length > 0) {
                this.currentStage = nst
                await this.metrics.with(
                  'collect',
                  { collector: nst.stageId },
                  async (ctx) => await nst.collect(toIndex2, this, ctx)
                )
              }
              if (this.cancelling) {
                break
              }
            }
          } else {
            break
          }

          // Check items with not updated state.
          for (const d of toIndex) {
            if (d.stages?.[st.stageId] === false) {
              this.skipped.set(d._id, (this.skipped.get(d._id) ?? 0) + 1)
            } else {
              this.skipped.delete(d._id)
            }
          }
        } catch (err: any) {
          console.error(err)
        }
      }
    }
    return Array.from(_classUpdate.values())
  }

  private async processRemove (): Promise<void> {
    while (true) {
      const result = await this.storage.findAll(
        core.class.DocIndexState,
        {
          removed: true
        },
        {
          sort: {
            modifiedOn: 1
          },
          projection: {
            _id: 1,
            stages: 1,
            objectClass: 1
          }
        }
      )

      this.toIndex = new Map(result.map((it) => [it._id, it]))

      this.extraIndex.clear()

      const toIndex = Array.from(this.toIndex.values())
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
        await this.storage.clean(DOMAIN_DOC_INDEX_STATE, toRemoveIds)
      } else {
        break
      }
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
      if (require.every((it) => o.stages?.[it])) {
        toIndex.push(o)
      }
    }
    return toIndex
  }

  async checkIndexConsistency (dbStorage: ServerStorage): Promise<void> {
    if (process.env.MODEL_VERSION !== undefined) {
      const modelVersion = (await this.model.findAll(core.class.Version, {}))[0]
      if (modelVersion !== undefined) {
        const modelVersionString = versionToString(modelVersion)
        if (modelVersionString !== process.env.MODEL_VERSION) {
          console.error('Indexer: Model version mismatch', modelVersionString, process.env.MODEL_VERSION)
          return
        }
      }
    }

    this.hierarchy.domains()
    const allClasses = this.hierarchy.getDescendants(core.class.Doc)
    for (const c of allClasses) {
      if (this.cancelling) {
        return
      }

      if (!isClassIndexable(this.hierarchy, c)) {
        // No need, since no indexable fields or attachments.
        continue
      }

      console.log(this.workspace.name, 'checking index', c)

      // All saved state documents
      const states = (
        await this.storage.findAll(core.class.DocIndexState, { objectClass: c }, { projection: { _id: 1 } })
      ).map((it) => it._id)

      while (true) {
        if (this.cancelling) {
          return
        }
        const newDocs: DocIndexState[] = (
          await dbStorage.findAll<Doc>(
            this.metrics,
            c,
            { _class: c, _id: { $nin: states } },
            { limit: 1000, projection: { _id: 1, attachedTo: 1, attachedToClass: 1 } as any }
          )
        ).map((it) => {
          return createStateDoc(it._id, c, {
            stages: {},
            attributes: {},
            removed: false,
            space: it.space,
            attachedTo: (it as AttachedDoc)?.attachedTo ?? undefined,
            attachedToClass: (it as AttachedDoc)?.attachedToClass ?? undefined
          })
        })

        states.push(...newDocs.map((it) => it._id))

        if (newDocs.length === 0) {
          // All updated for this class
          break
        }

        try {
          await this.storage.upload(DOMAIN_DOC_INDEX_STATE, newDocs)
        } catch (err: any) {
          console.error(err)
        }
      }
      const statesSet = new Set(states)
      const docIds = (await dbStorage.findAll<Doc>(this.metrics, c, { _class: c }, { projection: { _id: 1 } }))
        .filter((it) => !statesSet.has(it._id as Ref<DocIndexState>))
        .map((it) => it._id)
      await this.storage.clean(DOMAIN_DOC_INDEX_STATE, docIds)
    }

    // Clean for non existing classes

    const unknownClasses = (
      await this.storage.findAll(
        core.class.DocIndexState,
        { objectClass: { $nin: allClasses } },
        { projection: { _id: 1 } }
      )
    ).map((it) => it._id)
    if (unknownClasses.length > 0) {
      await this.storage.clean(DOMAIN_DOC_INDEX_STATE, unknownClasses)
    }
  }
}
