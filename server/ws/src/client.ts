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
  AccountRole,
  TxFactory,
  TxProcessor,
  toIdMap,
  type Account,
  type Class,
  type Doc,
  type DocumentQuery,
  type FindOptions,
  type FindResult,
  type MeasureContext,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type Timestamp,
  type Tx,
  type TxApplyIf,
  type TxApplyResult,
  type TxCUD
} from '@hcengineering/core'
import { SessionContextImpl, createBroadcastEvent, type Pipeline } from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'
import { type ClientSessionCtx, type Session, type SessionRequest, type StatisticsElement } from './types'

/**
 * @public
 */
export class ClientSession implements Session {
  createTime = Date.now()
  requests = new Map<string, SessionRequest>()
  binaryMode: boolean = false
  useCompression: boolean = true
  sessionId = ''
  lastRequest = Date.now()

  total: StatisticsElement = { find: 0, tx: 0 }
  current: StatisticsElement = { find: 0, tx: 0 }
  mins5: StatisticsElement = { find: 0, tx: 0 }
  measures: { id: string, message: string, time: 0 }[] = []

  constructor (
    protected readonly token: Token,
    protected readonly _pipeline: Pipeline
  ) {}

  getUser (): string {
    return this.token.email
  }

  isUpgradeClient (): boolean {
    return this.token.extra?.model === 'upgrade'
  }

  getMode (): string {
    return this.token.extra?.mode ?? 'normal'
  }

  pipeline (): Pipeline {
    return this._pipeline
  }

  async ping (ctx: ClientSessionCtx): Promise<void> {
    // console.log('ping')
    this.lastRequest = Date.now()
    await ctx.sendResponse('pong!')
  }

  async loadModel (ctx: ClientSessionCtx, lastModelTx: Timestamp, hash?: string): Promise<void> {
    const result = await ctx.ctx.with(
      'load-model',
      {},
      async () => await this._pipeline.storage.loadModel(lastModelTx, hash)
    )
    await ctx.sendResponse(result)
  }

  async getAccount (ctx: ClientSessionCtx): Promise<void> {
    const account = await this._pipeline.modelDb.findAll(core.class.Account, { email: this.token.email })
    if (account.length === 0 && this.token.extra?.admin === 'true') {
      const systemAccount = await this._pipeline.modelDb.findAll(core.class.Account, {
        _id: this.token.email as Ref<Account>
      })
      if (systemAccount.length === 0) {
        // Generate account for admin user
        const factory = new TxFactory(core.account.System)
        const email = `system:${this.token.email}`
        const createTx = factory.createTxCreateDoc(
          core.class.Account,
          core.space.Model,
          {
            role: AccountRole.Owner,
            email
          },
          this.token.email as Ref<Account>
        )
        const context = new SessionContextImpl(
          ctx.ctx,
          this.token.email,
          this.sessionId,
          this.token.extra?.admin === 'true',
          [],
          this._pipeline.storage.workspaceId,
          this._pipeline.storage.branding
        )
        await this._pipeline.tx(context, createTx)
        const acc = TxProcessor.createDoc2Doc(createTx)
        await ctx.sendResponse(acc)
        return
      } else {
        await ctx.sendResponse(systemAccount[0])
        return
      }
    }
    await ctx.sendResponse(account[0])
  }

  async findAllRaw<T extends Doc>(
    ctx: MeasureContext,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    this.lastRequest = Date.now()
    this.total.find++
    this.current.find++
    const context = new SessionContextImpl(
      ctx,
      this.token.email,
      this.sessionId,
      this.token.extra?.admin === 'true',
      [],
      this._pipeline.storage.workspaceId,
      this._pipeline.storage.branding
    )
    return await this._pipeline.findAll(context, _class, query, options)
  }

  async findAll<T extends Doc>(
    ctx: ClientSessionCtx,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<void> {
    await ctx.sendResponse(await this.findAllRaw(ctx.ctx, _class, query, options))
  }

  async searchFulltext (ctx: ClientSessionCtx, query: SearchQuery, options: SearchOptions): Promise<void> {
    this.lastRequest = Date.now()
    const context = new SessionContextImpl(
      ctx.ctx,
      this.token.email,
      this.sessionId,
      this.token.extra?.admin === 'true',
      [],
      this._pipeline.storage.workspaceId,
      this._pipeline.storage.branding
    )
    await ctx.sendResponse(await this._pipeline.searchFulltext(context, query, options))
  }

  async tx (ctx: ClientSessionCtx, tx: Tx): Promise<void> {
    this.lastRequest = Date.now()
    this.total.tx++
    this.current.tx++
    const context = new SessionContextImpl(
      ctx.ctx,
      this.token.email,
      this.sessionId,
      this.token.extra?.admin === 'true',
      [],
      this._pipeline.storage.workspaceId,
      this._pipeline.storage.branding
    )

    const result = await this._pipeline.tx(context, tx)

    // Send result immideately
    await ctx.sendResponse(result)

    // We need to combine all derived data and check if we need to send it

    // Combine targets by sender

    const toSendTarget = new Map<string, Tx[]>()

    const getTxes = (key: string): Tx[] => {
      let txes = toSendTarget.get(key)
      if (txes === undefined) {
        txes = []
        toSendTarget.set(key, txes)
      }
      return txes
    }

    // Put current user as send target
    toSendTarget.set(this.getUser(), [])
    for (const txd of context.derived) {
      if (txd.target === undefined) {
        getTxes('') // be sure we have empty one

        // Also add to all other targeted sends
        for (const v of toSendTarget.values()) {
          v.push(...txd.derived)
        }
      } else {
        for (const t of txd.target) {
          getTxes(t).push(...txd.derived)
        }
      }
    }

    const handleSend = async (derived: Tx[], target?: string, exclude?: string[]): Promise<void> => {
      if (derived.length === 0) {
        return
      }

      if (derived.length > 10000) {
        await this.sendWithPart(derived, ctx, target, exclude)
      } else {
        // Let's send after our response will go out
        console.log('Broadcasting', derived.length, derived.length)
        await ctx.send(derived, target, exclude)
      }
    }

    const toSendAll = toSendTarget.get('') ?? []
    toSendTarget.delete('')

    // Send original Txes first.
    if (tx._class === core.class.TxApplyIf && (result as TxApplyResult).success) {
      const txMap = toIdMap((tx as TxApplyIf).txes as Tx[])

      for (const [k, derived] of toSendTarget.entries()) {
        // good, we could send apply transactions first.
        const part1 = derived.filter((it) => txMap.has(it._id))
        await ctx.send(part1, k, undefined)

        toSendTarget.set(
          k,
          derived.filter((it) => !txMap.has(it._id))
        )
      }
    }
    if (tx._class !== core.class.TxApplyIf) {
      for (const [k, derived] of toSendTarget.entries()) {
        // good, we could send apply transactions first.
        const part1 = derived.filter((it) => it._id === tx._id)
        await ctx.send(part1, k, undefined)

        toSendTarget.set(
          k,
          derived.filter((it) => it._id !== tx._id)
        )
      }
    }
    // Then send targeted and all other
    for (const [k, v] of toSendTarget.entries()) {
      void handleSend(v, k)
    }
    // Send all other except us.
    void handleSend(toSendAll, undefined, Array.from(toSendTarget.keys()))
  }

  private async sendWithPart (
    derived: Tx[],
    ctx: ClientSessionCtx,
    target: string | undefined,
    exclude: string[] | undefined
  ): Promise<void> {
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
    console.log('Broadcasting compact bulk', derived.length)
    const bevent = createBroadcastEvent(Array.from(classes))
    await ctx.send([bevent], target, exclude)
  }
}
