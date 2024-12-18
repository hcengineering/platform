//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { gunzip } from 'zlib'
import { promisify } from 'util'
import {
  Hierarchy,
  type MeasureContext,
  ModelDb,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type Ref,
  type Tx,
  type TxResult
} from '@hcengineering/core'

interface TransactorRawApi {
  findAll: (_class: Ref<Class<Doc>>, query?: DocumentQuery<Doc>, options?: FindOptions<Doc>) => Promise<FindResult<Doc>>

  tx: (tx: Tx) => Promise<TxResult>

  getModel: () => Promise<Buffer>
}

export interface TransactorClient {
  findAll: (_class: Ref<Class<Doc>>, query?: DocumentQuery<Doc>, options?: FindOptions<Doc>) => Promise<FindResult<Doc>>

  tx: (tx: Tx) => Promise<TxResult>

  getModel: () => Promise<ModelDb>
}

export interface TransactorService {
  openRpc: (rawToken: string, workspaceId: string) => Promise<TransactorRawApi>
}

export async function unpackModel (compressed: Buffer): Promise<Tx[]> {
  const ungzipAsync = promisify(gunzip)
  const buffer = await ungzipAsync(new Uint8Array(compressed))
  const decoder = new TextDecoder()
  const jsonString = decoder.decode(buffer)
  const model = JSON.parse(jsonString) as Tx[]
  return model
}

export class TransactorRpcClient implements TransactorClient {
  private transactorRpcStub: TransactorRawApi | undefined
  private model: ModelDb | undefined

  constructor (
    private readonly ctx: MeasureContext,
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly transactorService: TransactorService
  ) {}

  private async transactorStub (): Promise<TransactorRawApi> {
    if (this.transactorRpcStub === undefined) {
      this.transactorRpcStub = await this.transactorService.openRpc(this.token, this.workspaceId)
    }
    return this.transactorRpcStub
  }

  async findAll (
    _class: Ref<Class<Doc>>,
    query?: DocumentQuery<Doc>,
    options?: FindOptions<Doc>
  ): Promise<FindResult<Doc>> {
    const stub = await this.transactorStub()
    return await stub.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    const stub = await this.transactorStub()
    return await stub.tx(tx)
  }

  async getModel (): Promise<ModelDb> {
    if (this.model === undefined) {
      const stub = await this.transactorStub()
      const compressed = await stub.getModel()
      const txes = await unpackModel(compressed)
      const hierarchy = new Hierarchy()
      for (const tx of txes) {
        hierarchy.tx(tx)
      }
      this.model = new ModelDb(hierarchy)
      this.model.addTxes(this.ctx, txes, false)
    }
    return this.model
  }

  [Symbol.dispose] (): void {
    if (this.transactorRpcStub !== undefined && Symbol.dispose in this.transactorRpcStub) {
      ;(this.transactorRpcStub as any)[Symbol.dispose]()
    }
  }
}

export class TransactorHttpClient implements TransactorClient {
  constructor (
    private readonly ctx: MeasureContext,
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly transactorApiUrl: string
  ) {}

  async findAll (
    _class: Ref<Class<Doc>>,
    query?: DocumentQuery<Doc>,
    options?: FindOptions<Doc>
  ): Promise<FindResult<Doc>> {
    throw new Error('Not implemented')
  }

  async tx (tx: Tx): Promise<TxResult> {
    throw new Error('Not implemented')
  }

  async getModel (): Promise<ModelDb> {
    throw new Error('Not implemented')
  }
}
