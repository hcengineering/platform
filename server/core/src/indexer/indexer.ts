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
  Doc,
  DocIndexState,
  DocumentQuery,
  DocumentUpdate,
  DOMAIN_DOC_INDEX_STATE,
  Hierarchy,
  Ref,
  ServerStorage,
  setObjectValue,
  WorkspaceId,
  _getOperator
} from '@hcengineering/core'
import { DbAdapter } from '../adapter'
import type { FullTextAdapter, IndexedDoc } from '../types'
import { fieldStateId, FullTextPipeline, FullTextPipelineStage } from './types'
import { createStateDoc, docKey, extractDocKey, isClassIndexable } from './utils'

export * from './content'
export * from './field'
export * from './types'
export * from './utils'

/**
 * @public
 */
export class FullTextIndexPipeline implements FullTextPipeline {
  pending: Map<Ref<DocIndexState>, DocumentUpdate<DocIndexState>> = new Map()
  toIndex: Map<Ref<DocIndexState>, DocIndexState> = new Map()
  toIndexParents: Map<Ref<DocIndexState>, DocIndexState> = new Map()
  stageChanged = 0

  pendingElastic: Map<Ref<DocIndexState>, IndexedDoc> = new Map()

  cancelling: boolean = false

  currentStage: FullTextPipelineStage | undefined

  readyStages: string[]

  indexing: Promise<void> | undefined

  // Temporary skipped items
  skipped = new Map<Ref<DocIndexState>, number>()

  constructor (
    private readonly storage: DbAdapter,
    private readonly stages: FullTextPipelineStage[],
    private readonly adapter: FullTextAdapter,
    readonly hierarchy: Hierarchy,
    readonly workspace: WorkspaceId
  ) {
    this.readyStages = stages.map((it) => it.stageId)
    this.readyStages.sort()
  }

  async cancel (): Promise<void> {
    console.log('Cancel indexing', this.workspace)
    this.cancelling = true
    clearTimeout(this.waitTimeout)
    this.triggerIndexing()
    await this.indexing
    await this.flush(true)
    console.log('Indexing canceled', this.workspace)
  }

  async search (
    _classes: Ref<Class<Doc>>[],
    search: DocumentQuery<Doc>,
    size: number | undefined,
    from?: number
  ): Promise<{ docs: IndexedDoc[], pass: boolean }> {
    const result: IndexedDoc[] = []
    for (const st of this.stages) {
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
      // We need convert elastic update to a proper document.
      const toUpdate: IndexedDoc[] = []
      for (const o of this.pendingElastic.values()) {
        const doc: IndexedDoc = {
          _class: o._class,
          id: o.id,
          space: o.space,
          modifiedBy: o.modifiedBy,
          modifiedOn: o.modifiedOn
        }
        updateDoc2Elastic(o, doc)
        toUpdate.push(doc)
      }
      const promises: Promise<void>[] = []
      if (toUpdate.length > 0) {
        promises.push(
          this.adapter.updateMany(toUpdate).then(() => {
            this.pendingElastic.clear()
          })
        )
      }

      // Push all pending changes to storage.
      promises.push(
        this.storage.update(DOMAIN_DOC_INDEX_STATE, this.pending).then(() => {
          this.pending.clear()
        })
      )
      await Promise.all(promises)
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
      ops.set(docId, { ['stages.' + fieldStateId]: false, removed })
      await this.storage.update(DOMAIN_DOC_INDEX_STATE, ops)
    }
    this.triggerIndexing()
  }

  // Update are commulative
  async update (
    docId: Ref<DocIndexState>,
    mark: boolean,
    update: DocumentUpdate<DocIndexState>,
    elasticUpdate: Partial<IndexedDoc>,
    flush?: boolean
  ): Promise<void> {
    let udoc = this.toIndex.get(docId)
    if (udoc !== undefined) {
      await this.stageUpdate(udoc, update, elasticUpdate)

      udoc = this.updateDoc(udoc, update, mark)
      this.toIndex.set(docId, udoc)
    }

    // For Elastic we also need to check parent
    if (udoc === undefined) {
      udoc = this.toIndexParents.get(docId)
      if (udoc !== undefined) {
        await this.stageUpdate(udoc, update, elasticUpdate)
        udoc = this.updateDoc(udoc, update, mark)
        this.toIndexParents.set(docId, udoc)
      }
    }

    if (udoc === undefined) {
      // Some updated, document, let's load it.
      udoc = (await this.storage.load(DOMAIN_DOC_INDEX_STATE, [docId])).shift() as DocIndexState
    }

    if (udoc !== undefined && this.currentStage !== undefined) {
      const stageId = this.currentStage.stageId
      // Update current stage, value
      update.stages = { ...(udoc.stages ?? {}) }
      update.stages[stageId] = mark

      for (const [k] of Object.entries(update.stages)) {
        if (!this.currentStage.clearExcept.includes(k)) {
          update.stages[k] = false
        }
      }

      // Filter unsupported stages
      udoc.stages = update.stages

      this.stats[stageId] = (this.stats[stageId] ?? 0) + 1
      this.stageChanged++
    }

    // Collect elastic update
    if (udoc !== undefined && Object.keys(elasticUpdate).length !== 0) {
      const currentElastic = await this.getElastic(udoc)
      currentElastic.modifiedOn = Date.now()
      this.pendingElastic.set(docId, { ...currentElastic, ...elasticUpdate })
    }

    const current = this.pending.get(docId)
    if (current === undefined) {
      this.pending.set(docId, update)
    } else {
      this.pending.set(docId, { ...current, ...update })
    }

    await this.flush(flush ?? false)
  }

  async getElastic (doc: DocIndexState): Promise<IndexedDoc> {
    let current = this.pendingElastic.get(doc._id)
    if (current === undefined) {
      current = createElasticDoc(doc)
      this.pendingElastic.set(doc._id, current)
    }
    return current
  }

  triggerIndexing = (): void => {}
  waitTimeout: any
  stats: Record<string, number> = {}

  private async stageUpdate (
    udoc: DocIndexState,
    update: DocumentUpdate<DocIndexState>,
    elasticUpdate: Partial<IndexedDoc>
  ): Promise<void> {
    for (const u of this.currentStage?.updateFields ?? []) {
      await u(udoc, update, elasticUpdate)
    }
  }

  async startIndexing (): Promise<void> {
    this.indexing = this.doIndexing()
  }

  async doIndexing (): Promise<void> {
    // Check model is upgraded to support indexer.

    try {
      this.hierarchy.getClass(core.class.DocIndexState)
    } catch (err: any) {
      console.log('Models is not upgraded to support indexer', this.workspace)
      return
    }
    await this.initStates()
    while (!this.cancelling) {
      await this.processRemove()
      await this.processIndex()

      if (this.toIndex.size === 0 || this.stageChanged === 0) {
        if (this.toIndex.size === 0) {
          console.log(`${this.workspace.name} Indexing complete, waiting changes`)
        } else {
          console.log(`${this.workspace.name} Partial Indexing complete, waiting changes`)
        }
        if (!this.cancelling) {
          await new Promise((resolve) => {
            this.triggerIndexing = () => {
              resolve(null)
              clearTimeout(this.waitTimeout)
            }
            this.waitTimeout = setTimeout(() => {
              // Force skipped reiteration, just decrease by -1
              for (const [s, v] of Array.from(this.skipped.entries())) {
                this.skipped.set(s, v - 1)
              }
              resolve(null)
            }, 30000)
          })
        }
      }
    }
    console.log('Exit indexer', this.workspace)
  }

  private async processIndex (): Promise<void> {
    for (const st of this.stages) {
      while (true) {
        try {
          if (this.cancelling) {
            return
          }
          await this.flush(true)
          const toSkip = Array.from(this.skipped.entries())
            .filter((it) => it[1] > 3)
            .map((it) => it[0])

          const result = await this.storage.findAll(
            core.class.DocIndexState,
            {
              [`stages.${st.stageId}`]: { $nin: [true] },
              _id: { $nin: toSkip },
              removed: false
            },
            {
              limit: st.limit,
              sort: {
                modifiedOn: 1
              }
            }
          )

          if (result.length > 0) {
            console.log(
              `Fulltext: Indexing ${this.workspace.name} ${st.stageId}`,
              Object.entries(this.stats)
                .map((it) => `${it[0]}:${it[1]}`)
                .join(' '),
              result.total
            )
          } else {
            // Nothing to index, check on next cycle.
            break
          }

          this.toIndex = new Map(result.map((it) => [it._id, it]))

          this.toIndexParents.clear()
          this.stageChanged = 0
          // Find documents matching query
          const toIndex = this.matchStates(st)

          if (toIndex.length > 0) {
            // Do Indexing
            this.currentStage = st
            await st.collect(toIndex, this)
          } else {
            break
          }

          // Check items with not updated state.
          for (const d of toIndex) {
            if (!d.stages?.[st.stageId]) {
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
  }

  private async processRemove (): Promise<void> {
    while (true) {
      const result = await this.storage.findAll(
        core.class.DocIndexState,
        {
          removed: true
        },
        {
          limit: 1000,
          sort: {
            modifiedOn: 1
          },
          lookup: {
            attachedTo: core.class.DocIndexState
          }
        }
      )

      this.toIndex = new Map(result.map((it) => [it._id, it]))

      this.toIndexParents.clear()

      const toRemoveIds = Array.from(this.toIndex.keys())

      for (const st of this.stages) {
        const toIndex = Array.from(this.toIndex.values())
        if (toIndex.length > 0) {
          // Do Indexing
          this.currentStage = st
          await st.remove(toIndex, this)
        } else {
          break
        }
      }

      await this.flush(true)
      if (toRemoveIds.length > 0) {
        await this.storage.clean(DOMAIN_DOC_INDEX_STATE, toRemoveIds)
        await this.adapter.remove(toRemoveIds)
      } else {
        break
      }
    }
  }

  private async initStates (): Promise<void> {
    const statistics = await this.storage.findAll(core.class.DocIndexState, {}, { projection: { stages: 1 } })
    this.stats = {}
    for (const st of this.stages) {
      this.stats[st.stageId] = 0
    }
    for (const st of statistics) {
      for (const [s, v] of Object.entries(st.stages ?? {})) {
        if (v) {
          this.stats[s] = (this.stats[s] ?? 0) + 1
        }
      }
    }
  }

  private matchStates (st: FullTextPipelineStage): DocIndexState[] {
    const toIndex: DocIndexState[] = []
    for (const o of this.toIndex.values()) {
      // We need to contain all state values
      if (st.require.every((it) => o.stages?.[it])) {
        toIndex.push(o)
      }
    }
    return toIndex
  }

  async checkIndexConsistency (dbStorage: ServerStorage): Promise<void> {
    this.hierarchy.domains()
    // await this.rebuildElastic()
    const allClasses = this.hierarchy.getDescendants(core.class.Doc)
    for (const c of allClasses) {
      if (this.cancelling) {
        return
      }

      if (!isClassIndexable(this.hierarchy, c)) {
        // No need, since no indixable fields or attachments.
        continue
      }

      // All saved state documents
      const states = (
        await this.storage.findAll(core.class.DocIndexState, { objectClass: c }, { projection: { _id: 1 } })
      ).map((it) => it._id)

      while (true) {
        const newDocs: DocIndexState[] = (
          await dbStorage.findAll<Doc>(
            this.adapter.metrics(),
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
        console.log('Updated state for: ', c, newDocs.length)
      }
      const statesSet = new Set(states)
      const docIds = (
        await dbStorage.findAll<Doc>(this.adapter.metrics(), c, { _class: c }, { projection: { _id: 1 } })
      )
        .filter((it) => !statesSet.has(it._id as Ref<DocIndexState>))
        .map((it) => it._id)
      await this.storage.clean(DOMAIN_DOC_INDEX_STATE, docIds)
    }
  }

  async rebuildElastic (): Promise<void> {
    // rebuild elastic
    const allDocs = await this.storage.findAll(core.class.DocIndexState, {})
    const toUpdate: DocIndexState[] = allDocs.filter((it) => it.attributes.openai_embedding_use)
    while (toUpdate.length > 0) {
      this.toIndex = new Map<Ref<DocIndexState>, DocIndexState>(toUpdate.splice(0, 500).map((it) => [it._id, it]))
      const elasticDocs = await this.adapter.load(Array.from(this.toIndex.keys()))
      let hasUpdates = false
      for (const o of elasticDocs) {
        const odoc = this.toIndex.get(o.id as Ref<DocIndexState>) as DocIndexState
        if (odoc.attributes.openai_embedding_use as boolean) {
          hasUpdates = true
          odoc.attributes.openai_embedding = o.openai_embedding
          o.openai_embedding_use = true
        }
      }
      if (hasUpdates) {
        try {
          await this.storage.upload(DOMAIN_DOC_INDEX_STATE, Array.from(this.toIndex.values()))
          await this.adapter.updateMany(elasticDocs)
        } catch (err: any) {
          console.error(err)
        }
      }
    }
  }
}

/**
 * @public
 */
export function createElasticDoc (upd: DocIndexState): IndexedDoc {
  const doc = {
    ...upd.attributes,
    id: upd._id,
    _class: upd.objectClass,
    modifiedBy: upd.modifiedBy,
    modifiedOn: upd.modifiedOn,
    space: upd.space,
    attachedTo: upd.attachedTo,
    attachedToClass: upd.attachedToClass
  }
  return doc
}
function updateDoc2Elastic (attributes: Record<string, any>, doc: IndexedDoc): IndexedDoc {
  for (const [k, v] of Object.entries(attributes)) {
    const { _class, attr, docId, extra } = extractDocKey(k)
    let vv: any = v
    if (extra.includes('base64')) {
      vv = Buffer.from(v, 'base64').toString()
    }
    if (docId === undefined) {
      doc[k] = vv
      continue
    }
    const docIdAttr = '|' + docKey(attr, { _class, extra: extra.filter((it) => it !== 'base64') })
    if (vv !== null) {
      // Since we replace array of values, we could ignore null
      doc[docIdAttr] = [...(doc[docIdAttr] ?? []), vv]
    }
  }
  return doc
}
