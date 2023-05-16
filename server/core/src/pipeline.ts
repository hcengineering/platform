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
  Class,
  Doc,
  DocumentQuery,
  Domain,
  FindOptions,
  FindResult,
  MeasureContext,
  ModelDb,
  Ref,
  ServerStorage,
  StorageIterator,
  Tx,
  TxResult
} from '@hcengineering/core'
import { DbConfiguration, createServerStorage } from './storage'
import { BroadcastFunc, Middleware, MiddlewareCreator, Pipeline, SessionContext } from './types'

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
  const storage = await createServerStorage(conf, {
    upgrade,
    broadcast
  })
  const pipeline = PipelineImpl.create(ctx, storage, constructors, broadcast)
  return await pipeline
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
      current = await element(ctx, broadcast, this.storage, current)
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
