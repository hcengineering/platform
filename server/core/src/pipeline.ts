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
  type ServerStorage,
  type StorageIterator,
  type Tx,
  type TxResult
} from '@hcengineering/core'
import { createServerStorage } from './server'
import { type DbConfiguration } from './configuration'
import {
  type BroadcastFunc,
  type HandledBroadcastFunc,
  type Middleware,
  type MiddlewareCreator,
  type Pipeline,
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
  broadcast: BroadcastFunc
): Promise<Pipeline> {
  let broadcastHook: HandledBroadcastFunc = (): Tx[] => {
    return []
  }
  const storage = await ctx.with(
    'create-server-storage',
    {},
    async (ctx) =>
      await createServerStorage(ctx, conf, {
        upgrade,
        broadcast: (tx: Tx[], targets?: string[]) => {
          const sendTx = broadcastHook?.(tx, targets) ?? tx
          broadcast(sendTx, targets)
        }
      })
  )
  const pipeline = ctx.with(
    'create pipeline',
    {},
    async (ctx) => await PipelineImpl.create(ctx, storage, constructors, broadcast)
  )
  const pipelineResult = await pipeline
  broadcastHook = (tx, targets) => {
    return pipelineResult.handleBroadcast(tx, targets)
  }
  return pipelineResult
}

class PipelineImpl implements Pipeline {
  private head: Middleware | undefined
  readonly modelDb: ModelDb
  private constructor (readonly storage: ServerStorage) {
    this.modelDb = storage.modelDb
  }

  handleBroadcast (tx: Tx[], targets?: string[]): Tx[] {
    return this.head?.handleBroadcast(tx, targets) ?? tx
  }

  static async create (
    ctx: MeasureContext,
    storage: ServerStorage,
    constructors: MiddlewareCreator[],
    broadcast: BroadcastFunc
  ): Promise<PipelineImpl> {
    const pipeline = new PipelineImpl(storage)
    pipeline.head = await pipeline.buildChain(ctx, constructors, broadcast)
    return pipeline
  }

  private async buildChain (
    ctx: MeasureContext,
    constructors: MiddlewareCreator[],
    broadcast: BroadcastFunc
  ): Promise<Middleware | undefined> {
    let current: Middleware | undefined
    for (let index = constructors.length - 1; index >= 0; index--) {
      const element = constructors[index]
      current = await ctx.with('build chain', {}, async (ctx) => await element(ctx, broadcast, this.storage, current))
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
      : await this.storage.findAll(ctx, _class, query, options)
  }

  async searchFulltext (ctx: SessionContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    return this.head !== undefined
      ? await this.head.searchFulltext(ctx, query, options)
      : await this.storage.searchFulltext(ctx, query, options)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<[TxResult, Tx[], string[] | undefined]> {
    if (this.head === undefined) {
      const res = await this.storage.tx(ctx, tx)
      return [...res, undefined]
    } else {
      return await this.head.tx(ctx, tx)
    }
  }

  async close (): Promise<void> {
    await this.storage.close()
  }

  find (domain: Domain): StorageIterator {
    return this.storage.find(domain)
  }

  async load (domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return await this.storage.load(domain, docs)
  }

  async upload (domain: Domain, docs: Doc[]): Promise<void> {
    await this.storage.upload(domain, docs)
  }

  async clean (domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    await this.storage.clean(domain, docs)
  }
}
