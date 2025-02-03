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

  public updateDocuments (q: Query, docs: Doc[], clean: boolean = false): void {
    if (q.options?.projection !== undefined) {
      return
    }
    for (const d of docs) {
      const classKey = Hierarchy.mixinOrClass(d) + ':' + JSON.stringify(q.options?.lookup ?? {})
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
    if (typeof query._id === 'string') {
      const desc = this.getHierarchy().getDescendants(_class)
      for (const des of desc) {
        const classKey =
          des + ':' + JSON.stringify(options?.lookup ?? {}) + ':' + JSON.stringify(options?.associations ?? {})
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
      const classKey =
        _class + ':' + JSON.stringify(options?.lookup ?? {}) + ':' + JSON.stringify(options?.associations ?? {})
      const docs = this.documentRefs.get(classKey)
      if (docs !== undefined) {
        const _docs = Array.from(docs.values()).map((it) => it.doc)

        const q = matchQuery(_docs, query, _class, this.getHierarchy())
        if (q.length > 0) {
          return toFindResult(this.getHierarchy().clone([q[0]]), 1)
        }
      }
    }
    return null
  }
}
