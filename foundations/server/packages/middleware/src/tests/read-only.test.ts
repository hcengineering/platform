//
// Copyright © 2026 TraceX SAS.
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
  MeasureMetricsContext,
  toFindResult,
  TxFactory,
  type Account,
  type AccountUuid,
  type Doc,
  type DocumentQuery,
  type DomainParams,
  type DomainResult,
  type MeasureContext,
  type OperationDomain,
  type PersonId,
  type SessionData
} from '@hcengineering/core'
import platform from '@hcengineering/platform'
import type { Middleware, PipelineContext, TxMiddlewareResult } from '@hcengineering/server-core'
import { ReadOnlyMiddleware } from '../read-only'

const SOCIAL = 'test:person:reader' as PersonId
const DOMAIN = 'test:domain' as OperationDomain

function context (readonly?: boolean, role: AccountRole = AccountRole.User): MeasureContext<SessionData> {
  const account: Account = {
    uuid: 'test:account:reader' as AccountUuid,
    role,
    primarySocialId: SOCIAL,
    socialIds: [SOCIAL],
    fullSocialIds: []
  }
  const data: Partial<SessionData> = { account, readonly }
  const ctx: MeasureContext<SessionData> = new MeasureMetricsContext('test', {}) as MeasureContext<SessionData>
  ctx.contextData = data as SessionData
  return ctx
}

describe('ReadOnlyMiddleware', () => {
  const txes = [new TxFactory(SOCIAL).createTxCreateDoc(core.class.Doc, core.space.Workspace, {})]
  const params: DomainParams = {}
  const txResult: TxMiddlewareResult = {}
  const domainResult: DomainResult = { domain: DOMAIN, value: null }

  async function middleware (): Promise<{ instance: ReadOnlyMiddleware, next: Partial<Middleware> }> {
    const pipeline: Partial<PipelineContext> = {}
    const next: Partial<Middleware> = {
      tx: jest.fn(async () => txResult),
      domainRequest: jest.fn(async () => domainResult),
      findAll: jest.fn(async () => toFindResult<never>([]))
    }
    const instance = await ReadOnlyMiddleware.create(
      new MeasureMetricsContext('test', {}),
      pipeline as PipelineContext,
      next as Middleware
    )
    return { instance, next }
  }

  it.each([AccountRole.User, AccountRole.Owner, AccountRole.Admin])(
    'rejects readonly transactions for %s without changing the account role',
    async (role) => {
      const { instance, next } = await middleware()
      const ctx = context(true, role)
      await expect(instance.tx(ctx, txes)).rejects.toMatchObject({ status: { code: platform.status.Forbidden } })
      expect(next.tx).not.toHaveBeenCalled()
      expect(ctx.contextData.account.role).toBe(role)
    }
  )

  it('rejects readonly domain requests before forwarding them', async () => {
    const { instance, next } = await middleware()
    await expect(instance.domainRequest(context(true), DOMAIN, params)).rejects.toMatchObject({
      status: { code: platform.status.Forbidden }
    })
    expect(next.domainRequest).not.toHaveBeenCalled()
  })

  it.each([undefined, false])('preserves writable requests when readonly is %s', async (readonly) => {
    const { instance, next } = await middleware()
    const ctx = context(readonly)
    await expect(instance.tx(ctx, txes)).resolves.toBe(txResult)
    await expect(instance.domainRequest(ctx, DOMAIN, params)).resolves.toBe(domainResult)
    expect(next.tx).toHaveBeenCalledWith(ctx, txes)
    expect(next.domainRequest).toHaveBeenCalledWith(ctx, DOMAIN, params)
  })

  it('forwards readonly queries with the original account and query', async () => {
    const { instance, next } = await middleware()
    const ctx = context(true)
    const query: DocumentQuery<Doc> = {}
    await instance.findAll(ctx, core.class.Doc, query)
    expect(next.findAll).toHaveBeenCalledWith(ctx, core.class.Doc, query, undefined)
    expect(ctx.contextData.account.role).toBe(AccountRole.User)
  })
})
