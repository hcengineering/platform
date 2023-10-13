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

import core, {
  Account,
  AccountRole,
  Class,
  Doc,
  DocumentQuery,
  FindOptions,
  FindResult,
  LoadModelResponse,
  MeasureContext,
  Ref,
  Timestamp,
  Tx,
  TxResult
} from '@hcengineering/core'
import { Pipeline, SessionContext } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'
import { BroadcastCall, Session, SessionRequest, StatisticsElement } from './types'

/**
 * @public
 */
export class ClientSession implements Session {
  requests: Map<string, SessionRequest> = new Map()
  binaryResponseMode: boolean = false
  useCompression: boolean = true
  sessionId = ''

  total: StatisticsElement = { find: 0, tx: 0 }
  current: StatisticsElement = { find: 0, tx: 0 }
  mins5: StatisticsElement = { find: 0, tx: 0 }

  constructor (
    protected readonly broadcast: BroadcastCall,
    protected readonly token: Token,
    protected readonly _pipeline: Pipeline
  ) {}

  getUser (): string {
    return this.token.email
  }

  pipeline (): Pipeline {
    return this._pipeline
  }

  async ping (): Promise<string> {
    // console.log('ping')
    return 'pong!'
  }

  async loadModel (ctx: MeasureContext, lastModelTx: Timestamp, hash?: string): Promise<Tx[] | LoadModelResponse> {
    return await this._pipeline.storage.loadModel(lastModelTx, hash)
  }

  async getAccount (ctx: MeasureContext): Promise<Account> {
    const account = await this._pipeline.modelDb.findAll(core.class.Account, { email: this.token.email })
    if (account.length === 0 && this.token.extra?.admin === 'true') {
      // Generate fake account for admin user
      const account = {
        _id: core.account.System,
        _class: 'contact:class:PersonAccount' as Ref<Class<Account>>,
        name: 'System,Ghost',
        email: this.token.email,
        space: core.space.Model,
        modifiedBy: core.account.System,
        modifiedOn: Date.now(),
        role: AccountRole.Owner
      }
      // Add for other services to work properly
      this._pipeline.modelDb.addDoc(account)
      return account
    }
    return account[0]
  }

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    this.total.find++
    this.current.find++
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    return await this._pipeline.findAll(context, _class, query, options)
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    this.total.tx++
    this.current.tx++
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    const [result, derived, target] = await this._pipeline.tx(context, tx)

    this.broadcast(this, this.token.workspace, { result: tx }, target)
    for (const dtx of derived) {
      this.broadcast(null, this.token.workspace, { result: dtx }, target)
    }
    return result
  }
}
