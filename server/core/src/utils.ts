import {
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  MeasureContext,
  Ref,
  ServerStorage
} from '@hcengineering/core'

/**
 * @public
 */
export function createFindAll (storage: ServerStorage): ServerStorage['findAll'] {
  return async <T extends Doc>(
    ctx: MeasureContext,
    clazz: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> => {
    return await storage.findAll(ctx, clazz, query, options)
  }
}
