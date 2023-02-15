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
  ModelDb,
  Ref,
  ServerStorage,
  StorageIterator,
  Tx,
  TxResult
} from '@hcengineering/core'
import { createServerStorage, DbConfiguration } from './storage'
import { Middleware, MiddlewareCreator, Pipeline, SessionContext } from './types'

/**
 * @public
 */
export async function createPipeline (
  conf: DbConfiguration,
  constructors: MiddlewareCreator[],
  upgrade: boolean,
  broadcast: (tx: Tx[]) => void
): Promise<Pipeline> {
  const storage = await createServerStorage(conf, {
    upgrade,
    broadcast
  })
  return new TPipeline(storage, constructors)
}

class TPipeline implements Pipeline {
  private readonly head: Middleware | undefined
  readonly modelDb: ModelDb
  constructor (readonly storage: ServerStorage, constructors: MiddlewareCreator[]) {
    this.head = this.buildChain(constructors)
    this.modelDb = storage.modelDb
  }

  private buildChain (constructors: MiddlewareCreator[]): Middleware | undefined {
    let current: Middleware | undefined
    for (let index = constructors.length - 1; index >= 0; index--) {
      const element = constructors[index]
      current = element(this.storage, current)
    }
    return current
  }

  async findAll<T extends Doc>(
    ctx: SessionContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const [session, resClass, resQuery, resOptions] =
      this.head === undefined ? [ctx, _class, query, options] : await this.head.findAll(ctx, _class, query, options)
    return await this.storage.findAll(session, resClass, resQuery, resOptions)
  }

  async tx (ctx: SessionContext, tx: Tx): Promise<[TxResult, Tx[], string | undefined]> {
    const [session, resTx, target] = this.head === undefined ? [ctx, tx] : await this.head.tx(ctx, tx)
    const res = await this.storage.tx(session, resTx)
    return [res[0], res[1], target]
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
