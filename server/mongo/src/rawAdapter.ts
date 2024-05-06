import {
  SortingOrder,
  cutObjectArray,
  toFindResult,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type WorkspaceId
} from '@hcengineering/core'
import type { RawDBAdapter, RawDBAdapterStream } from '@hcengineering/server-core'
import { type Document, type Filter, type FindCursor, type Sort } from 'mongodb'
import { toArray, uploadDocuments } from './storage'
import { getMongoClient, getWorkspaceDB } from './utils'

export function createRawMongoDBAdapter (url: string): RawDBAdapter {
  const client = getMongoClient(url)

  const collectSort = (options: FindOptions<Doc>): Sort | undefined => {
    if (options?.sort === undefined) {
      return undefined
    }
    const sort: Sort = {}
    let count = 0
    for (const key in options.sort) {
      const order = options.sort[key] === SortingOrder.Ascending ? 1 : -1
      sort[key] = order
      count++
    }
    if (count === 0) {
      return undefined
    }
    return sort
  }

  async function getCursor<T extends Doc> (
    workspace: WorkspaceId,
    domain: Domain,
    query: DocumentQuery<T>,
    options?: Omit<FindOptions<T>, 'projection' | 'lookup'>
  ): Promise<{
      cursor: FindCursor<T>
      total: number
    }> {
    const db = getWorkspaceDB(await client.getClient(), workspace)
    const coll = db.collection(domain)
    let cursor = coll.find<T>(query as Filter<Document>, {
      checkKeys: false
    })

    let total: number = -1
    if (options != null) {
      if (options.sort !== undefined) {
        const sort = collectSort(options)
        if (sort !== undefined) {
          cursor = cursor.sort(sort)
        }
      }
      if (options.limit !== undefined || typeof query._id === 'string') {
        if (options.total === true) {
          total = await coll.countDocuments(query)
        }
        cursor = cursor.limit(options.limit ?? 1)
      }
    }
    return { cursor, total }
  }

  return {
    find: async function <T extends Doc>(
      ctx: MeasureContext,
      workspace: WorkspaceId,
      domain: Domain,
      query: DocumentQuery<T>,
      options?: Omit<FindOptions<T>, 'projection' | 'lookup'>
    ): Promise<FindResult<T>> {
      let { cursor, total } = await getCursor(workspace, domain, query, options)

      // Error in case of timeout
      try {
        const res = await toArray<T>(cursor)
        if (options?.total === true && options?.limit === undefined) {
          total = res.length
        }
        return toFindResult(res, total)
      } catch (e) {
        console.error('error during executing cursor in findAll', cutObjectArray(query), options, e)
        throw e
      }
    },
    findStream: async function <T extends Doc>(
      ctx: MeasureContext,
      workspace: WorkspaceId,
      domain: Domain,
      query: DocumentQuery<T>,
      options?: Omit<FindOptions<T>, 'projection' | 'lookup'>
    ): Promise<RawDBAdapterStream<T>> {
      const { cursor } = await getCursor(workspace, domain, query, options)

      return {
        next: async () => (await cursor.next()) ?? undefined,
        close: async () => {
          await cursor.close()
        }
      }
    },
    upload: async (ctx: MeasureContext, workspace, domain, docs) => {
      const db = getWorkspaceDB(await client.getClient(), workspace)
      const coll = db.collection(domain)
      await uploadDocuments(ctx, docs, coll)
    },
    close: async () => {
      client.close()
    },
    clean: async (ctx, workspace, domain, docs) => {
      const db = getWorkspaceDB(await client.getClient(), workspace)
      const coll = db.collection<Doc>(domain)
      await coll.deleteMany({ _id: { $in: docs } })
    }
  }
}
