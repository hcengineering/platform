import {
  SortingOrder,
  cutObjectArray,
  toFindResult,
  type Doc,
  type DocumentQuery,
  type DocumentUpdate,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type WorkspaceId
} from '@hcengineering/core'
import type { RawDBAdapter, RawDBAdapterStream } from '@hcengineering/server-core'
import { type Document, type Filter, type FindCursor, type MongoClient, type Sort } from 'mongodb'
import { toArray, uploadDocuments } from './storage'
import { getMongoClient, getWorkspaceDB } from './utils'

export function createRawMongoDBAdapter (url: string): RawDBAdapter {
  const client = getMongoClient(url)
  let mongoClient: MongoClient | undefined

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
    options?: Omit<FindOptions<T>, 'projection' | 'lookup' | 'total'>
  ): Promise<{
      cursor: FindCursor<T>
      total: number
    }> {
    mongoClient = mongoClient ?? (await client.getClient())
    const db = getWorkspaceDB(mongoClient, workspace)
    const coll = db.collection(domain)
    let cursor = coll.find<T>(query as Filter<Document>, {
      checkKeys: false
    })

    const total: number = -1
    if (options != null) {
      if (options.sort !== undefined) {
        const sort = collectSort(options)
        if (sort !== undefined) {
          cursor = cursor.sort(sort)
        }
      }
      if (options.limit !== undefined || typeof query._id === 'string') {
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
      options?: Omit<FindOptions<T>, 'projection' | 'lookup' | 'total'>
    ): Promise<FindResult<T>> {
      const { cursor, total } = await ctx.with(
        'get-cursor',
        {},
        async () => await getCursor(workspace, domain, query, options)
      )

      // Error in case of timeout
      try {
        const res = await ctx.with('to-array', {}, async () => await toArray<T>(cursor), {
          ...query,
          ...options
        })
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
      options?: Omit<FindOptions<T>, 'projection' | 'lookup' | 'total'>
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
      mongoClient = mongoClient ?? (await client.getClient())
      const db = getWorkspaceDB(mongoClient, workspace)
      const coll = db.collection(domain)
      await uploadDocuments(ctx, docs, coll)
    },
    close: async () => {
      client.close()
    },
    clean: async (ctx, workspace, domain, docs) => {
      mongoClient = mongoClient ?? (await client.getClient())
      const db = getWorkspaceDB(mongoClient, workspace)
      const coll = db.collection<Doc>(domain)
      await coll.deleteMany({ _id: { $in: docs } })
    },
    update: async (
      ctx: MeasureContext,
      workspace: WorkspaceId,
      domain: Domain,
      operations: Map<Ref<Doc>, DocumentUpdate<Doc>>
    ): Promise<void> => {
      await ctx.with('update', { domain }, async () => {
        mongoClient = mongoClient ?? (await client.getClient())
        const db = getWorkspaceDB(mongoClient, workspace)
        const coll = db.collection(domain)

        // remove old and insert new ones
        const ops = Array.from(operations.entries())
        let skip = 500
        while (ops.length > 0) {
          const part = ops.splice(0, skip)
          try {
            await ctx.with('raw-bulk-write', {}, async () => {
              await coll.bulkWrite(
                part.map((it) => {
                  const { $unset, ...set } = it[1] as any
                  if ($unset !== undefined) {
                    for (const k of Object.keys(set)) {
                      if ($unset[k] === '') {
                        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
                        delete $unset[k]
                      }
                    }
                  }
                  return {
                    updateOne: {
                      filter: { _id: it[0] },
                      update: {
                        $set: { ...set, '%hash%': null },
                        ...($unset !== undefined ? { $unset } : {})
                      }
                    }
                  }
                }),
                {
                  ordered: false
                }
              )
            })
          } catch (err: any) {
            ctx.error('failed on bulk write', { error: err, skip })
            if (skip !== 1) {
              ops.push(...part)
              skip = 1 // Let's update one by one, to loose only one failed variant.
            }
          }
        }
      })
    }
  }
}
