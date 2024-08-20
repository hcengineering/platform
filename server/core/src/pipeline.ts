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

import {
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type ModelDb,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type StorageIterator,
  type Tx,
  type TxResult,
  type Branding
} from '@hcengineering/core'
import { type DbConfiguration } from './configuration'
import { createServerStorage } from './server'
import {
  type BroadcastFunc,
  type Middleware,
  type MiddlewareCreator,
  type Pipeline,
  type ServerStorage,
  type SessionContext
} from './types'

/**
 * @public
 */
export async function createPipeline (
  ctx: MeasureContext,
  conf: DbConfiguration,
  constructors: MiddlewareCreator[],
  upgrade: boolean,
  broadcast: BroadcastFunc,
  branding: Branding | null,
  disableTriggers?: boolean
): Promise<Pipeline> {
  const broadcastHandlers: BroadcastFunc[] = [broadcast]
  const _broadcast: BroadcastFunc = (
    tx: Tx[],
    targets: string | string[] | undefined,
    exclude: string[] | undefined
  ) => {
    for (const handler of broadcastHandlers) handler(tx, targets, exclude)
  }
  const storage = await ctx.with(
    'create-server-storage',
    {},
    async (ctx) =>
      await createServerStorage(ctx, conf, {
        upgrade,
        broadcast: _broadcast,
        branding,
        disableTriggers
      })
  )
  const pipelineResult = await PipelineImpl.create(ctx.newChild('pipeline-operations', {}), storage, constructors)
  broadcastHandlers.push((tx: Tx[], targets: string | string[] | undefined, exclude: string[] | undefined) => {
    void pipelineResult.handleBroadcast(tx, targets, exclude)
  })
  return pipelineResult
}

class PipelineImpl implements Pipeline {
  private head: Middleware | undefined
  readonly modelDb: ModelDb
  private constructor (readonly storage: ServerStorage) {
    this.modelDb = storage.modelDb
  }

  static async create (
    ctx: MeasureContext,
    storage: ServerStorage,
    constructors: MiddlewareCreator[]
  ): Promise<PipelineImpl> {
    const pipeline = new PipelineImpl(storage)
    pipeline.head = await pipeline.buildChain(ctx, constructors)
    return pipeline
  }

  private async buildChain (ctx: MeasureContext, constructors: MiddlewareCreator[]): Promise<Middleware | undefined> {
    let current: Middleware | undefined
    for (let index = constructors.length - 1; index >= 0; index--) {
      const element = constructors[index]
      current = await ctx.with('build chain', {}, async (ctx) => await element(ctx, this.storage, current))
    }
    return current
  }

  async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.head !== undefined
      ? await this.head.findAll(ctx, _class, query, options)
      : await this.storage.findAll(ctx.ctx, _class, query, options)
  }

  async groupBy<T>(ctx: MeasureContext, domain: Domain, field: string): Promise<Set<T>> {
    return this.head !== undefined
      ? await this.head.groupBy(ctx, domain, field)
      : await this.storage.groupBy(ctx, domain, field)
  }

  async searchFulltext (ctx: SessionContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.head !== undefined
      ? await this.head.searchFulltext(ctx, query, options)
      : await this.storage.searchFulltext(ctx.ctx, query, options)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<TxResult> {
    if (this.head === undefined) {
      return await this.storage.tx(ctx, tx)
    } else {
      return await this.head.tx(ctx, tx)
    }
  }

  async handleBroadcast (tx: Tx[], targets?: string | string[], exclude?: string[]): Promise<void> {
    if (this.head !== undefined) {
      await this.head.handleBroadcast(tx, targets, exclude)
    }
  }

  async close (): Promise<void> {
    await this.storage.close()
  }

  find (ctx: MeasureContext, domain: Domain): StorageIterator {
    return this.storage.find(ctx, domain)
  }

  async load (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.storage.load(ctx, domain, docs)
  }

  async upload (ctx: MeasureContext, domain: Domain, docs: Doc[]): Promise<void> {
    await this.storage.upload(ctx, domain, docs)
  }

  async clean (ctx: MeasureContext, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.storage.clean(ctx, domain, docs)
  }
}
