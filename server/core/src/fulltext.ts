//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  FindOptions,
  FindResult,
  Hierarchy,
  MeasureContext,
  ObjQueryType,
  Ref,
  ServerStorage,
  toFindResult,
  Tx,
  TxCollectionCUD,
  TxCUD,
  TxFactory,
  TxResult,
  WorkspaceId
} from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { FullTextIndexPipeline } from './indexer'
import { createStateDoc, isClassIndexable } from './indexer/utils'
import type { FullTextAdapter, IndexedDoc, WithFind } from './types'

/**
 * @public
 */
export class FullTextIndex implements WithFind {
  txFactory = new TxFactory(core.account.System)
  closed = false

  consistency: Promise<void> | undefined

  constructor (
    private readonly hierarchy: Hierarchy,
    private readonly adapter: FullTextAdapter,
    private readonly dbStorage: ServerStorage,
    readonly storageAdapter: MinioService | undefined,
    readonly workspace: WorkspaceId,
    readonly indexer: FullTextIndexPipeline,
    private readonly upgrade: boolean
  ) {
    if (!upgrade) {
      this.consistency = this.indexer.checkIndexConsistency(dbStorage)

      // Schedule indexing after consistency check
      void this.consistency.then(() => {
        void this.indexer.startIndexing()
      })
    }
  }

  async close (): Promise<void> {
    this.closed = true
    await this.consistency
    await this.indexer.cancel()
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    let attachedTo: Ref<DocIndexState> | undefined
    let attachedToClass: Ref<Class<Doc>> | undefined
    if (tx._class === core.class.TxCollectionCUD) {
      const txcol = tx as TxCollectionCUD<Doc, AttachedDoc>
      attachedTo = txcol.objectId as Ref<DocIndexState>
      attachedToClass = txcol.objectClass
      tx = txcol.tx
    }
    if (this.hierarchy.isDerived(tx._class, core.class.TxCUD)) {
      const cud = tx as TxCUD<Doc>

      if (!isClassIndexable(this.hierarchy, cud.objectClass)) {
        // No need, since no indixable fields or attachments.
        return {}
      }

      let stDoc: DocIndexState | undefined
      if (cud._class === core.class.TxCreateDoc) {
        // Add doc for indexing
        stDoc = createStateDoc(cud.objectId, cud.objectClass, {
          attributes: {},
          stages: {},
          attachedTo,
          attachedToClass,
          space: tx.objectSpace,
          removed: false
        })
      }
      await this.indexer.queue(
        cud.objectId as Ref<DocIndexState>,
        cud._class === core.class.TxCreateDoc,
        cud._class === core.class.TxRemoveDoc,
        stDoc
      )

      this.indexer.triggerIndexing()
    }
    return {}
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    console.log('search', query)
    const { _id, $search, ...mainQuery } = query
    if ($search === undefined) return toFindResult([])

    const ids: Set<Ref<Doc>> = new Set<Ref<Doc>>()
    const baseClass = this.hierarchy.getBaseClass(_class)
    let classes = this.hierarchy.getDescendants(baseClass)

    const attrs = this.hierarchy.getAllAttributes(_class)
    try {
      for (const attr of attrs.values()) {
        if (attr.type._class === core.class.Collection) {
          // we need attached documents to be in clases
          const dsc = this.hierarchy.getDescendants(attr.attributeOf)
          classes = classes.concat(dsc)
        }
      }
    } catch (err: any) {
      console.error(err)
    }

    classes = classes.filter((it, idx, arr) => arr.indexOf(it) === idx)

    const fullTextLimit = 10000
    let { docs, pass } = await this.indexer.search(classes, query, fullTextLimit)

    if (docs.length === 0 && pass) {
      docs = [...docs, ...(await this.adapter.search(classes, query, fullTextLimit))]
    }
    const indexedDocMap = new Map<Ref<Doc>, IndexedDoc>()

    for (const doc of docs) {
      if (this.hierarchy.isDerived(doc._class, baseClass)) {
        ids.add(doc.id)
        indexedDocMap.set(doc.id, doc)
      }
      if (doc.attachedTo != null) {
        if (doc.attachedToClass != null && this.hierarchy.isDerived(doc.attachedToClass, baseClass)) {
          if (this.hierarchy.isDerived(doc.attachedToClass, baseClass)) {
            ids.add(doc.attachedTo)
            indexedDocMap.set(doc.attachedTo, doc)
          }
        } else {
          ids.add(doc.attachedTo)
          indexedDocMap.set(doc.attachedTo, doc)
        }
      }
    }
    if (docs.length === 0) {
      return toFindResult([], 0)
    }
    const scoreSearch: number | undefined = (options?.sort as any)?.['#score']

    const resultIds = Array.from(getResultIds(ids, _id))
    let result = await this.dbStorage.findAll(
      ctx,
      _class,
      { _id: { $in: resultIds }, ...mainQuery },
      {
        ...options,
        limit: scoreSearch !== undefined ? docs.length : options?.limit
      }
    )

    // Just assign scores based on idex
    result.forEach((it) => {
      const idDoc = indexedDocMap.get(it._id)
      const { _score, id, _class, ...extra } = idDoc as any
      it.$source = {
        ...extra,
        $score: _score
      }
    })
    if (scoreSearch !== undefined) {
      result.sort((a, b) => scoreSearch * ((a.$source?.$score ?? 0) - (b.$source?.$score ?? 0)))
    }
    if (scoreSearch !== undefined) {
      if (options?.limit !== undefined && options?.limit < result.length) {
        result = toFindResult(result.slice(0, options?.limit), result.total)
      }
    }
    return result
  }

  submitting: Promise<void> | undefined

  timeout: any
}

function getResultIds (ids: Set<Ref<Doc>>, _id: ObjQueryType<Ref<Doc>> | undefined): Set<Ref<Doc>> {
  const result = new Set<Ref<Doc>>()
  if (_id !== undefined) {
    if (typeof _id === 'string') {
      if (!ids.has(_id)) {
        return new Set()
      } else {
        result.add(_id)
      }
    } else if (_id.$in !== undefined) {
      for (const id of _id.$in) {
        if (ids.has(id)) {
          result.add(id)
        }
      }
    } else if (_id.$nin !== undefined) {
      for (const id of ids) {
        if (!_id.$nin.includes(id)) {
          result.add(id)
        }
      }
    }
  } else {
    return ids
  }
  return result
}
