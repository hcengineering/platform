import {
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  Hierarchy,
  LowLevelStorage,
  MeasureMetricsContext,
  ModelDb,
  Ref,
  WorkspaceIds
} from '@hcengineering/core'
import { MigrateUpdate, MigrationClient, MigrationIterator, ModelLogger } from '@hcengineering/model'
import { Pipeline, StorageAdapter } from '@hcengineering/server-core'

/**
 * Upgrade client implementation.
 */
export class MigrateClientImpl implements MigrationClient {
  private readonly lowLevel: LowLevelStorage
  constructor (
    readonly pipeline: Pipeline,
    readonly hierarchy: Hierarchy,
    readonly model: ModelDb,
    readonly logger: ModelLogger,
    readonly storageAdapter: StorageAdapter,
    readonly wsIds: WorkspaceIds
  ) {
    if (this.pipeline.context.lowLevelStorage === undefined) {
      throw new Error('lowLevelStorage is not defined')
    }
    this.lowLevel = this.pipeline.context.lowLevelStorage
  }

  migrateState = new Map<string, Set<string>>()

  async find<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<T[]> {
    return await this.lowLevel.rawFindAll(domain, query, options)
  }

  async traverse<T extends Doc>(
    domain: Domain,
    query: DocumentQuery<T>,
    options?: FindOptions<T> | undefined
  ): Promise<MigrationIterator<T>> {
    return await this.lowLevel.traverse(domain, query, options)
  }

  async update<T extends Doc>(domain: Domain, query: DocumentQuery<T>, operations: MigrateUpdate<T>): Promise<void> {
    const t = Date.now()
    try {
      await this.lowLevel.rawUpdate(domain, query, operations)
    } finally {
      if (Date.now() - t > 1000) {
        this.logger.log(`update${Date.now() - t > 5000 ? 'slow' : ''}`, { domain, query, time: Date.now() - t })
      }
    }
  }

  async bulk<T extends Doc>(
    domain: Domain,
    operations: { filter: DocumentQuery<T>, update: MigrateUpdate<T> }[]
  ): Promise<void> {
    for (const ops of operations) {
      await this.lowLevel.rawUpdate(domain, ops.filter, ops.update)
    }
  }

  async move<T extends Doc>(sourceDomain: Domain, query: DocumentQuery<T>, targetDomain: Domain): Promise<void> {
    const ctx = new MeasureMetricsContext('move', {})
    this.logger.log('move', { sourceDomain, query })
    while (true) {
      const source = await this.lowLevel.rawFindAll(sourceDomain, query, { limit: 500 })
      if (source.length === 0) break
      await this.lowLevel.upload(ctx, targetDomain, source)
      await this.lowLevel.clean(
        ctx,
        sourceDomain,
        source.map((p) => p._id)
      )
    }
  }

  async create<T extends Doc>(domain: Domain, doc: T | T[]): Promise<void> {
    const ctx = new MeasureMetricsContext('create', {})
    await this.lowLevel.upload(ctx, domain, Array.isArray(doc) ? doc : [doc])
  }

  async delete<T extends Doc>(domain: Domain, _id: Ref<T>): Promise<void> {
    const ctx = new MeasureMetricsContext('delete', {})
    await this.lowLevel.clean(ctx, domain, [_id])
  }

  async deleteMany<T extends Doc>(domain: Domain, query: DocumentQuery<T>): Promise<void> {
    await this.lowLevel.rawDeleteMany(domain, query)
  }
}
