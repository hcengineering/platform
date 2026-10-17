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

import { MeasureMetricsContext, type Ref, type Tx } from '@hcengineering/core'
import { getDBClient } from '@hcengineering/postgres-base'
import { loadLastTxCache } from '../lastTx'

jest.mock('@hcengineering/postgres-base', () => ({ getDBClient: jest.fn() }))

function mockRows (rows: Array<{ workspaceId: string, _id: string }>): jest.Mock {
  const unsafe = jest.fn().mockResolvedValue(rows)
  const close = jest.fn()
  const begin = jest.fn(async (fn: (tx: any) => Promise<any>) => await fn({ unsafe }))
  ;(getDBClient as jest.Mock).mockReturnValue({
    getClient: jest.fn().mockResolvedValue({ begin }),
    close
  })
  return close
}

describe('loadLastTxCache', () => {
  const ctx = new MeasureMetricsContext('test', {})

  it('applies query rows to the cache and closes the ref', async () => {
    const close = mockRows([
      { workspaceId: 'ws1', _id: 'tx1' },
      { workspaceId: 'ws2', _id: 'tx2' }
    ])
    const cache = new Map<string, Ref<Tx>>()
    await loadLastTxCache(ctx, 'postgresql://x', cache)
    expect(cache.get('ws1')).toBe('tx1')
    expect(cache.get('ws2')).toBe('tx2')
    expect(close).toHaveBeenCalled()
  })

  it('does not overwrite a live write-back entry with the older snapshot', async () => {
    mockRows([{ workspaceId: 'ws1', _id: 'txOld' }])
    const cache = new Map<string, Ref<Tx>>([['ws1', 'txNew' as Ref<Tx>]])
    await loadLastTxCache(ctx, 'postgresql://x', cache)
    expect(cache.get('ws1')).toBe('txNew')
  })
  it('leaves the cache empty and closes the ref when the query fails or times out', async () => {
    const close = jest.fn()
    ;(getDBClient as jest.Mock).mockReturnValue({
      getClient: jest.fn().mockResolvedValue({
        begin: jest.fn().mockRejectedValue(new Error('canceling statement due to statement timeout'))
      }),
      close
    })
    const cache = new Map<string, Ref<Tx>>()
    await expect(loadLastTxCache(ctx, 'postgresql://x', cache)).resolves.toBeUndefined()
    expect(cache.size).toBe(0)
    expect(close).toHaveBeenCalled()
  })

  it('does nothing when disabled with LAST_TX_CACHE=false', async () => {
    process.env.LAST_TX_CACHE = 'false'
    try {
      ;(getDBClient as jest.Mock).mockClear()
      const cache = new Map<string, Ref<Tx>>()
      await loadLastTxCache(ctx, 'postgresql://x', cache)
      expect(getDBClient).not.toHaveBeenCalled()
      expect(cache.size).toBe(0)
    } finally {
      delete process.env.LAST_TX_CACHE
    }
  })
})
