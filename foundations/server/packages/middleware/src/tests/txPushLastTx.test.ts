//
// Copyright © 2025 Hardcore Engineering Inc.
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

import core, { DOMAIN_TX, MeasureMetricsContext, type Ref, type Tx, TxFactory } from '@hcengineering/core'
import type { PipelineContext } from '@hcengineering/server-core'
import { TxMiddleware } from '../txPush'

const ctxWithBroadcast = (): MeasureMetricsContext => {
  const ctx = new MeasureMetricsContext('test', {})
  ctx.contextData = { broadcast: { txes: [], targets: {}, queue: [], sessions: {} } } as any
  return ctx
}

describe('TxMiddleware lastTx write-back', () => {
  const workspaceUuid = 'ws-1'

  function setup (contextVars: Record<string, any>): { mw: TxMiddleware, context: any, stored: Tx[] } {
    const stored: Tx[] = []
    const context: any = {
      hierarchy: { findDomain: () => 'space' },
      contextVars,
      workspace: { uuid: workspaceUuid },
      lastTx: 'boot-tx',
      adapterManager: {
        getAdapter: jest.fn((domain: string) => {
          expect(domain).toBe(DOMAIN_TX)
          return { tx: jest.fn(async (_ctx: any, ...txes: Tx[]) => stored.push(...txes)) }
        })
      }
    }
    const mw = new (TxMiddleware as any)(context as PipelineContext, undefined) as TxMiddleware
    mw.adapterManager = context.adapterManager
    // provideTx has no next middleware in this test
    ;(mw as any).provideTx = jest.fn(async () => ({ txes: [] }))
    return { mw, context, stored }
  }

  const mkTx = (): Tx => {
    const f = new TxFactory(core.account.System)
    return f.createTxCreateDoc(core.class.Space, core.space.Space, {
      name: 'x',
      description: '',
      private: false,
      archived: false,
      members: []
    } as any)
  }

  it('updates both context.lastTx and the shared boot cache after a stored tx', async () => {
    const lastTxCache = new Map<string, Ref<Tx>>([[workspaceUuid, 'boot-tx' as Ref<Tx>]])
    const { mw, context } = setup({ lastTxCache })
    const tx = mkTx()

    await mw.tx(ctxWithBroadcast(), [tx])

    expect(context.lastTx).toBe(tx._id)
    expect(lastTxCache.get(workspaceUuid)).toBe(tx._id)
  })

  it('works when no cache is configured', async () => {
    const { mw, context } = setup({})
    const tx = mkTx()

    await mw.tx(ctxWithBroadcast(), [tx])

    expect(context.lastTx).toBe(tx._id)
  })

  it('does not touch the cache when nothing is stored', async () => {
    const lastTxCache = new Map<string, Ref<Tx>>([[workspaceUuid, 'boot-tx' as Ref<Tx>]])
    const { mw, context } = setup({ lastTxCache })

    await mw.tx(ctxWithBroadcast(), [])

    expect(context.lastTx).toBe('boot-tx')
    expect(lastTxCache.get(workspaceUuid)).toBe('boot-tx')
  })
})
