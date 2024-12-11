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
  docKey,
  DOMAIN_DOC_INDEX_STATE,
  isFullTextAttribute,
  isIndexedAttribute,
  toFindResult,
  type AttachedDoc,
  type Class,
  type Collection,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type FullTextSearchContext,
  type MeasureContext,
  type ObjQueryType,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SessionData,
  type Tx
} from '@hcengineering/core'
import { PlatformError, unknownError } from '@hcengineering/platform'
import type {
  IndexedDoc,
  Middleware,
  MiddlewareCreator,
  PipelineContext,
  TxMiddlewareResult
} from '@hcengineering/server-core'
import { BaseMiddleware } from '@hcengineering/server-core'
/**
 * @public
 */
export class FullTextMiddleware extends BaseMiddleware implements Middleware {
  fulltextEndpoint: string
  contexts = new Map<Ref<Class<Doc>>, FullTextSearchContext>()

  warmupTriggered: boolean = false

  constructor (
    context: PipelineContext,
    next: Middleware | undefined,
    fulltextUrl: string,
    readonly token: string
  ) {
    super(context, next)
    const fulltextEndpoints = fulltextUrl.split(';').map((it) => it.trim())

    const hash = this.hashWorkspace(context.workspace.uuid)
    this.fulltextEndpoint = fulltextEndpoints[Math.abs(hash % fulltextEndpoints.length)]
  }

  hashWorkspace (dbWorkspaceName: string): number {
    return [...dbWorkspaceName].reduce((hash, c) => (Math.imul(31, hash) + c.charCodeAt(0)) | 0, 0)
  }

  static create (url: string, token: string): MiddlewareCreator {
    return async (ctx, context, next): Promise<Middleware> => {
      const middleware = new FullTextMiddleware(context, next, url, token)
      await middleware.init(ctx)
      return middleware
    }
  }

  async handleBroadcast (ctx: MeasureContext<SessionData>): Promise<void> {
    if (ctx.contextData.fulltextUpdates !== undefined && ctx.contextData.fulltextUpdates.size > 0) {
      const toUpdate = Array.from(ctx.contextData.fulltextUpdates.values())
      ctx.contextData.fulltextUpdates.clear()
      await this.context.lowLevelStorage?.upload(ctx, DOMAIN_DOC_INDEX_STATE, toUpdate)
      this.sendWarmup()
    }
    await super.handleBroadcast(ctx)
  }

  async init (ctx: MeasureContext): Promise<void> {
    if (this.context.adapterManager == null) {
      throw new PlatformError(unknownError('Adapter manager should be specified'))
    }
    this.contexts = new Map(
      this.context.modelDb.findAllSync(core.class.FullTextSearchContext, {}).map((it) => [it.toClass, it])
    )

    // Send one warumup so reindex will
    this.sendWarmup()
  }

  sendWarmup (): void {
    if (!this.warmupTriggered) {
      this.warmupTriggered = true
      setTimeout(() => {
        this.warmupTriggered = false
        void this._sendWarmup().catch(() => {})
      }, 25)
    }
  }

  async _sendWarmup (): Promise<void> {
    // Just send a warmup to indexer to start do something, or just reindex if some work are pending.
    try {
      await fetch(this.fulltextEndpoint + '/api/v1/warmup', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.token
        })
      })
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        return
      }
      Analytics.handleError(err)
    }
  }

  async search<T extends Doc>(
    _classes: Ref<Class<T>>[],
    query: DocumentQuery<T>,
    fullTextLimit: number
  ): Promise<IndexedDoc[]> {
    try {
      return await (
        await fetch(this.fulltextEndpoint + '/api/v1/search', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            token: this.token,
            workspace: this.context.workspace.uuid,
            _classes,
            query,
            fullTextLimit
          })
        })
      ).json()
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        // TODO:  We need to send event about indexing is complete after a while
        return []
      }
      Analytics.handleError(err)
      return []
    }
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    if (query?.$search === undefined) {
      return await this.provideFindAll(ctx, _class, query, options)
    }

    const { _id, $search, ...mainQuery } = query
    if ($search === undefined) {
      return toFindResult<T>([])
    }

    const ids: Set<Ref<Doc>> = new Set<Ref<Doc>>()
    const childIds: Set<Ref<Doc>> = new Set<Ref<Doc>>()
    const baseClass = this.context.hierarchy.getBaseClass(_class)
    let classes = this.context.hierarchy.getDescendants(baseClass).filter((it) => !this.context.hierarchy.isMixin(it))

    const attrs = this.context.hierarchy.getAllAttributes(_class)

    // We need to filter all non indexed fields from query to make it work properly
    const findQuery: DocumentQuery<Doc> = {
      $search: query.$search
    }

    const childClasses = new Set<Ref<Class<Doc>>>()
    try {
      for (const [k, attr] of attrs) {
        if (isFullTextAttribute(attr) || isIndexedAttribute(attr)) {
          const vv = (query as any)[k]
          if (vv != null) {
            if (
              k === '_class' ||
              k === 'modifiedBy' ||
              k === 'modifiedOn' ||
              k === 'space' ||
              k === 'attachedTo' ||
              k === 'attachedToClass'
            ) {
              findQuery[k] = vv
            } else {
              const docKeyValue = docKey(attr.name, attr.attributeOf)
              findQuery[docKeyValue] = vv
            }
          }
        }
        if (attr.type._class === core.class.Collection) {
          // we need attached documents to be in classes
          const coll = attr.type as Collection<AttachedDoc>
          const dsc = this.context.hierarchy.getDescendants(coll.of).filter((it) => !this.context.hierarchy.isMixin(it))
          for (const d of dsc) {
            childClasses.add(d)
          }
        }
      }
    } catch (err: any) {
      Analytics.handleError(err)
    }

    classes = classes.filter((it, idx, arr) => arr.indexOf(it) === idx)

    classes = classes.filter((it) => {
      if (typeof query._class === 'object') {
        if (query._class?.$in !== undefined) {
          return query._class.$in.includes(it)
        }
        if (query._class?.$nin !== undefined) {
          return !query._class.$nin.includes(it)
        }
      }
      return true
    })

    const fullTextLimit = Math.min(5000, (options?.limit ?? 200) * 100)

    // Find main documents, not attached ones.
    const { indexedDocMap } = await this.findDocuments<T>(classes, findQuery, fullTextLimit, baseClass, ids)

    for (const c of classes) {
      // We do not need to overlap
      childClasses.delete(c)
    }

    const childQuery: DocumentQuery<AttachedDoc> = {
      $search: findQuery.$search,
      attachedToClass: { $in: classes }
    }
    if (findQuery.space !== undefined) {
      childQuery.space = findQuery.space
    }
    const { childDocs, childIndexedDocMap } =
      childClasses !== undefined && childClasses.size > 0
        ? await this.findChildDocuments(Array.from(childClasses), childQuery, fullTextLimit, baseClass, childIds)
        : {
            childDocs: [],
            childIndexedDocMap: new Map()
          }

    const scoreSearch: number | undefined = (options?.sort as any)?.['#score']

    const resultIds = Array.from(this.getResultIds(ids, _id))
    const childResultIds = Array.from(this.getResultIds(childIds, _id))
    resultIds.push(...childResultIds)

    let result =
      resultIds.length > 0
        ? await this.provideFindAll(
          ctx,
          _class,
          { _id: { $in: Array.from(new Set(resultIds)) }, ...mainQuery },
          options
        )
        : toFindResult([])

    // Just assign scores based on idex
    result.forEach((it) => {
      const idDoc = indexedDocMap.get(it._id) ?? childIndexedDocMap.get(it._id)
      const { _score } = idDoc

      const maxScore = childDocs.reduceRight((p, cur) => (p > cur.$score ? p : cur.$score), _score)

      it.$source = {
        $score: maxScore
      }
    })
    if (scoreSearch !== undefined) {
      result.sort((a, b) => scoreSearch * ((a.$source?.$score ?? 0) - (b.$source?.$score ?? 0)))
      if (options?.limit !== undefined && options?.limit < result.length) {
        result = toFindResult(result.slice(0, options?.limit), result.total)
      }
    }
    return result
  }

  private async findDocuments<T extends Doc>(
    classes: Ref<Class<Doc>>[],
    findQuery: DocumentQuery<Doc>,
    fullTextLimit: number,
    baseClass: Ref<Class<T>>,
    ids: Set<Ref<Doc>>
  ): Promise<{ docs: IndexedDoc[], indexedDocMap: Map<Ref<Doc>, IndexedDoc> }> {
    const docs = await this.search(classes, findQuery, fullTextLimit)

    const indexedDocMap = new Map<Ref<Doc>, IndexedDoc>()

    for (const doc of docs) {
      if (
        doc._class != null &&
        Array.isArray(doc._class) &&
        doc._class.some((cl) => this.context.hierarchy.isDerived(cl, baseClass))
      ) {
        ids.add(doc.id)
        indexedDocMap.set(doc.id, doc)
      }
      if (
        doc._class !== null &&
        !Array.isArray(doc._class) &&
        this.context.hierarchy.isDerived(doc._class, baseClass)
      ) {
        ids.add(doc.id)
        indexedDocMap.set(doc.id, doc)
      }
    }
    return { docs, indexedDocMap }
  }

  private async findChildDocuments<T extends Doc>(
    classes: Ref<Class<Doc>>[],
    findQuery: DocumentQuery<Doc>,
    fullTextLimit: number,
    baseClass: Ref<Class<T>>,
    ids: Set<Ref<Doc>>
  ): Promise<{ childDocs: IndexedDoc[], childIndexedDocMap: Map<Ref<Doc>, IndexedDoc> }> {
    const childDocs = await this.search(classes, findQuery, fullTextLimit)

    const childIndexedDocMap = new Map<Ref<Doc>, IndexedDoc>()

    for (const doc of childDocs) {
      if (doc.attachedTo != null) {
        if (doc.attachedToClass != null && this.context.hierarchy.isDerived(doc.attachedToClass, baseClass)) {
          if (this.context.hierarchy.isDerived(doc.attachedToClass, baseClass)) {
            ids.add(doc.attachedTo)
            childIndexedDocMap.set(doc.attachedTo, doc)
          }
        } else {
          ids.add(doc.attachedTo)
          childIndexedDocMap.set(doc.attachedTo, doc)
        }
      }
    }
    return { childDocs, childIndexedDocMap }
  }

  async searchFulltext (ctx: MeasureContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    try {
      return await ctx.with('full-text-search', {}, async (ctx) => {
        return await (
          await fetch(this.fulltextEndpoint + '/api/v1/full-text-search', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              workspace: this.context.workspace.uuid,
              token: this.token,
              query,
              options
            })
          })
        ).json()
      })
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        // TODO:  We need to send event about indexing is complete after a while
        return { docs: [] }
      }
      Analytics.handleError(err)
      return { docs: [] }
    }
  }

  tx (ctx: MeasureContext, txes: Tx[]): Promise<TxMiddlewareResult> {
    return this.provideTx(ctx, txes)
  }

  async close (): Promise<void> {
    try {
      await fetch(this.fulltextEndpoint + '/api/v1/close', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: this.token
        })
      })
    } catch (err: any) {
      if (err?.cause?.code === 'ECONNRESET' || err?.cause?.code === 'ECONNREFUSED') {
        return
      }
      Analytics.handleError(err)
    }
  }

  getResultIds (ids: Set<Ref<Doc>>, _id: ObjQueryType<Ref<Doc>> | undefined): Set<Ref<Doc>> {
    const result = new Set<Ref<Doc>>()
    if (_id !== undefined) {
      if (typeof _id === 'string') {
        if (ids.has(_id)) {
          result.add(_id)
        }
      } else if (_id.$in !== undefined) {
        for (const id of _id.$in) {
          if (ids.has(id)) {
            result.add(id)
          }
        }
      } else if (_id.$nin !== undefined) {
        for (const id of _id.$nin) {
          ids.delete(id)
        }
        return ids
      } else if (_id.$ne !== undefined) {
        ids.delete(_id.$ne)
        return ids
      }
    } else {
      return ids
    }
    return result
  }
}
