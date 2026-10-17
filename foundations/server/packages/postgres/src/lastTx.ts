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

import { type MeasureContext, type Ref, type Tx } from '@hcengineering/core'
import { getDBClient } from '@hcengineering/postgres-base'

// The tx table has no index on (workspaceId, modifiedOn), so this is a full scan plus sort: it runs once at
// start in the background and is bounded by a statement timeout. On timeout/failure the cache stays empty and
// clients reconnect with a full Refresh, exactly as before.
const DEFAULT_TIMEOUT_MS = 30_000

function loadTimeoutMs (): number {
  const parsed = parseInt(process.env.LAST_TX_CACHE_TIMEOUT_MS ?? '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS
}

// One cross-workspace query for the latest tx id per workspace (DISTINCT ON = single scan).
// Fills the shared boot cache seeded into cold pipeline builds. LAST_TX_CACHE=false disables it.
export async function loadLastTxCache (ctx: MeasureContext, dbUrl: string, cache: Map<string, Ref<Tx>>): Promise<void> {
  if (process.env.LAST_TX_CACHE === 'false') {
    ctx.info('last-tx cache disabled')
    return
  }
  const timeoutMs = loadTimeoutMs()
  const ref = getDBClient(dbUrl)
  try {
    const client = await ref.getClient()
    const started = Date.now()
    // SET LOCAL stays inside the transaction, so it is safe behind a transaction-mode pooler
    const rows = (await client.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL statement_timeout = ${timeoutMs}`)
      return await tx.unsafe(
        'SELECT DISTINCT ON ("workspaceId") "workspaceId", _id FROM tx ORDER BY "workspaceId", "modifiedOn" DESC'
      )
    })) as unknown as Array<{ workspaceId: string, _id: string }>
    for (const row of rows) {
      // Don't clobber a live write-back: if a tx committed during this load, the txPush
      // update is newer than this snapshot, so only seed workspaces not already present.
      if (!cache.has(row.workspaceId)) cache.set(row.workspaceId, row._id as Ref<Tx>)
    }
    ctx.info('last-tx cache loaded', { workspaces: cache.size, ms: Date.now() - started })
  } catch (err: any) {
    ctx.error('failed to load last-tx cache', { err, timeoutMs })
  } finally {
    ref.close()
  }
}
