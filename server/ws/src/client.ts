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
  type Account,
  AccountRole,
  type BulkUpdateEvent,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type LoadModelResponse,
  type MeasureContext,
  type Ref,
  type Timestamp,
  type Tx,
  type TxApplyIf,
  type TxCUD,
  TxProcessor,
  type TxResult,
  type TxWorkspaceEvent,
  WorkspaceEvent,
  generateId,
  type SearchQuery,
  type SearchOptions,
  type SearchResult
} from '@hcengineering/core'
import { type Pipeline, type SessionContext } from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'
import { type BroadcastCall, type Session, type SessionRequest, type StatisticsElement } from './types'

/**
 * @public
 */
export class ClientSession implements Session {
  requests = new Map<string, SessionRequest>()
  binaryResponseMode: boolean = false
  useCompression: boolean = true
  useBroadcast: boolean = false
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
    context.admin = this.token.extra?.admin === 'true'
    return await this._pipeline.findAll(context, _class, query, options)
  }

  async searchFulltext (ctx: MeasureContext, query: SearchQuery, options: SearchOptions): Promise<SearchResult> {
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    context.admin = this.token.extra?.admin === 'true'
    return await this._pipeline.searchFulltext(context, query, options)
  }

  async tx (ctx: MeasureContext, tx: Tx): Promise<TxResult> {
    this.total.tx++
    this.current.tx++
    const context = ctx as SessionContext
    context.userEmail = this.token.email
    context.admin = this.token.extra?.admin === 'true'
    const [result, derived, target] = await this._pipeline.tx(context, tx)

    let shouldBroadcast = true

    if (tx._class === core.class.TxApplyIf) {
      const apply = tx as TxApplyIf
      shouldBroadcast = apply.notify ?? true
    }

    if (tx._class !== core.class.TxApplyIf) {
      this.broadcast(this, this.token.workspace, { result: tx }, target)
    }
    if (shouldBroadcast) {
      if (this.useBroadcast) {
        if (derived.length > 250) {
          const classes = new Set<Ref<Class<Doc>>>()
          for (const dtx of derived) {
            if (this._pipeline.storage.hierarchy.isDerived(dtx._class, core.class.TxCUD)) {
              classes.add((dtx as TxCUD<Doc>).objectClass)
            }
            const etx = TxProcessor.extractTx(dtx)
            if (this._pipeline.storage.hierarchy.isDerived(etx._class, core.class.TxCUD)) {
              classes.add((etx as TxCUD<Doc>).objectClass)
            }
          }
          console.log('Broadcasting bulk', derived.length)
          this.broadcast(null, this.token.workspace, { result: this.createBroadcastEvent(Array.from(classes)) }, target)
        } else {
          while (derived.length > 0) {
            const part = derived.splice(0, 250)
            console.log('Broadcasting part', part.length, derived.length)
            this.broadcast(null, this.token.workspace, { result: part }, target)
          }
        }
      } else {
        for (const dtx of derived) {
          this.broadcast(null, this.token.workspace, { result: dtx }, target)
        }
      }
    }
    if (tx._class === core.class.TxApplyIf) {
      const apply = tx as TxApplyIf

      if (apply.extraNotify !== undefined && apply.extraNotify.length > 0) {
        this.broadcast(null, this.token.workspace, { result: this.createBroadcastEvent(apply.extraNotify) }, target)
      }
    }
    return result
  }

  private createBroadcastEvent (classes: Ref<Class<Doc>>[]): TxWorkspaceEvent<BulkUpdateEvent> {
    return {
      _class: core.class.TxWorkspaceEvent,
      _id: generateId(),
      event: WorkspaceEvent.BulkUpdate,
      params: {
        _class: classes
      },
      modifiedBy: core.account.System,
      modifiedOn: Date.now(),
      objectSpace: core.space.DerivedTx,
      space: core.space.DerivedTx
    }
  }
}
