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
  FindOptions,
  FindResult,
  MeasureContext,
  Ref,
  Tx,
  TxResult
} from '@hcengineering/core'
import type { Pipeline, SessionContext } from '@hcengineering/server-core'
import { Token } from '@hcengineering/server-token'
import { BroadcastCall, Session } from './types'

/**
 * @public
 */
export class ClientSession implements Session {
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

  async findAll<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    return await this._pipeline.findAll(context, _class, query, options)
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    const [result, derived, target] = await this._pipeline.tx(context, tx)

    this. broadcast(this, this.token.workspace, { result: tx }, target)
    for (const dtx of derived) {
      this.broadcast(null, this.token.workspace, { result: dtx }, target)
    }
    return result
  }
}
