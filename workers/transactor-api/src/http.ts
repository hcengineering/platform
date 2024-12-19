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

import {
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type ModelDb,
  type Tx,
  type TxResult,
  type Ref
} from '@hcengineering/core'
import { type TransactorClient } from './types'

export async function createHttpClient (
  token: string,
  workspaceId: string,
  httpApiWorkerUrl: string
): Promise<TransactorClient> {
  return new TransactorHttpClient(token, workspaceId, httpApiWorkerUrl)
}

class TransactorHttpClient implements TransactorClient {
  constructor (
    private readonly token: string,
    private readonly workspaceId: string,
    private readonly httpApiWorkerUrl: string
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
