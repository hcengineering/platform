import {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  Hierarchy,
  MeasureContext,
  Ref,
  ServerStorage
} from '@hcengineering/core'

/**
 * @public
 */
export function createCacheFindAll (storage: ServerStorage): ServerStorage['findAll'] {
  // We will cache all queries for same objects for all derived data checks.
  const queryCache = new Map<string, FindResult<Doc>>()
  const hierarchy = new Hierarchy()

  return async <T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> => {
    const key = JSON.stringify(clazz) + JSON.stringify(query) + JSON.stringify(options)
    let cacheResult = queryCache.get(key)
    if (cacheResult !== undefined) {
      return cacheResult as FindResult<T>
    }
    cacheResult = await storage.findAll(ctx, clazz, query, options)
    queryCache.set(key, cacheResult)
    return hierarchy.clone(cacheResult) as FindResult<T>
  }
}
