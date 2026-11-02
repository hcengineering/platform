//
// Copyright © 2026 TraceX SAS.
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
  Hierarchy,
  matchQuery,
  toFindResult,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Ref,
  type Timestamp
} from '@hcengineering/core'
import type { Query, QueryId } from './types'

export interface DocumentRef {
  doc: Doc
  queries: QueryId[]
  lastUsed: Timestamp
}

export class Refs {
  // A map of _class to documents.
  private readonly documentRefs = new Map<string, Map<Ref<Doc>, DocumentRef>>()

  constructor (readonly getHierarchy: () => Hierarchy) {}

  invalidateQueries (queryIds: Set<QueryId>): void {
    for (const documents of this.documentRefs.values()) {
      for (const [id, ref] of documents) {
        if (ref.queries.some((query) => queryIds.has(query))) documents.delete(id)
      }
    }
  }

  private getParameters<T extends Doc>(options?: FindOptions<T>): string {
    return (
      ':' +
      (options?.unsecured === true) +
      ':' +
      JSON.stringify(options?.lookup ?? {}) +
      ':' +
      JSON.stringify(options?.associations ?? {})
    )
  }

  public updateDocuments (q: Query, docs: Doc[], clean: boolean = false): void {
    if (q.options?.projection !== undefined) {
      return
    }
    const params = this.getParameters(q.options)
    for (const d of docs) {
      const classKey = Hierarchy.mixinOrClass(d) + params

      let docMap = this.documentRefs.get(classKey)
      if (docMap === undefined) {
        if (clean) {
          continue
        }
        docMap = new Map()
        this.documentRefs.set(classKey, docMap)
      }
      const queries = (docMap.get(d._id)?.queries ?? []).filter((it) => it !== q.id)
      if (!clean) {
        queries.push(q.id)
      }
      if (queries.length === 0) {
        docMap.delete(d._id)
      } else {
        const q = docMap.get(d._id)
        if ((q?.lastUsed ?? 0) < d.modifiedOn) {
          docMap.set(d._id, { ...(q ?? {}), doc: d, queries, lastUsed: d.modifiedOn })
        }
      }
    }
  }

  public findFromDocs<T extends Doc>(
    _class: Ref<Class<Doc>>,
    query: DocumentQuery<Doc>,
    options?: FindOptions<T>
  ): FindResult<T> | null {
    const params = this.getParameters(options)
    if (typeof query._id === 'string') {
      const desc = this.getHierarchy().getDescendants(_class)
      for (const des of desc) {
        const classKey = des + params
        // One document query
        const doc = this.documentRefs.get(classKey)?.get(query._id)?.doc
        if (doc !== undefined) {
          const q = matchQuery([doc], query, _class, this.getHierarchy())
          if (q.length > 0) {
            return toFindResult(this.getHierarchy().clone([doc]), 1)
          }
        }
      }
    }
    if (
      options?.limit === 1 &&
      options.total !== true &&
      options?.sort === undefined &&
      options?.projection === undefined
    ) {
      const classKey = _class + params
      const docs = this.documentRefs.get(classKey)
      if (docs !== undefined) {
        const _docs = Array.from(docs.values()).map((it) => it.doc)

        const q = matchQuery(_docs, query, _class, this.getHierarchy())
        if (q.length > 0) {
          return toFindResult(this.getHierarchy().clone([q[0]]), 1)
        }
      }
      if (options.lookup === undefined && options.associations === undefined) {
        const keys = Array.from(this.documentRefs.keys())
        for (const key of keys) {
          if (key.startsWith(_class + ':' + (options.unsecured === true) + ':')) {
            const docs = this.documentRefs.get(key)
            if (docs !== undefined) {
              const _docs = Array.from(docs.values()).map((it) => it.doc)

              const q = matchQuery(_docs, query, _class, this.getHierarchy())
              if (q.length > 0) {
                const clonedDoc = this.getHierarchy().clone(q[0])
                const { $lookup, $associations, ...clean } = clonedDoc
                if (this.getHierarchy().isMixin(_class)) {
                  return toFindResult([this.getHierarchy().as(clean, _class)] as T[], 1)
                }
                return toFindResult([clean], 1)
              }
            }
          }
        }
      }
    }
    return null
  }
}
