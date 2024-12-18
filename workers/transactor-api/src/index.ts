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

import type { Class, Doc, DocumentQuery, FindOptions, FindResult, Ref, Tx, TxResult } from '@hcengineering/core'

export interface TransactorApi {
  findAll: (
    _class: Ref<Class<Doc>>,
    query?: DocumentQuery<Doc>,
    options?: FindOptions<Doc>
  ) => Promise<FindResult<Doc>>

  tx: (tx: Tx) => Promise<TxResult>
}

export interface TransactorService {
  openRpc: (rawToken: string, workspaceId: string) => Promise<TransactorApi>
}

export class TransactorRpcClient implements TransactorApi {
  private transactorRpcStub: TransactorApi | undefined

  constructor (
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly transactorService: TransactorService
  ) {}

  async findAll (
    _class: Ref<Class<Doc>>,
    query?: DocumentQuery<Doc>,
    options?: FindOptions<Doc>
  ): Promise<FindResult<Doc>> {
    if (this.transactorRpcStub === undefined) {
      this.transactorRpcStub = await this.transactorService.openRpc(this.token, this.workspaceId)
    }
    return await this.transactorRpcStub.findAll(_class, query, options)
  }

  async tx (tx: Tx): Promise<TxResult> {
    if (this.transactorRpcStub === undefined) {
      this.transactorRpcStub = await this.transactorService.openRpc(this.token, this.workspaceId)
    }
    return await this.transactorRpcStub.tx(tx)
  }

  [Symbol.dispose] (): void {
    if (this.transactorRpcStub !== undefined && Symbol.dispose in this.transactorRpcStub) {
      (this.transactorRpcStub as any)[Symbol.dispose]()
    }
  }
}

export class TransactorHttpClient implements TransactorApi {
  constructor (
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
}
