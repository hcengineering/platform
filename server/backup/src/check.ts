//
// Copyright © 2026 Hardcore Engineering Inc.
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

import { Doc, Domain, MeasureContext, Ref, type LowLevelStorage, type WorkspaceIds } from '@hcengineering/core'
import { BackupClientOps, type Pipeline } from '@hcengineering/server-core'
import { gunzipSync } from 'zlib'
import { BackupStorage } from './storage'
import type { BackupDocId, BackupInfo } from './types'
import { compareDomainDigest, isAccountDomain, loadDigest } from './utils'
export * from './storage'

/**
 * @public
 */
export interface DomainCheckResult {
  domain: Domain
  backupCount: number
  workspaceCount: number
  missing: BackupDocId[]
  modified: BackupDocId[]
}

/**
 * @public
 */
export interface WorkspaceCheckResult {
  date: number
  domains: DomainCheckResult[]
  ok: boolean
}

/**
 * Checks whether all documents recorded in a backup are present, and unchanged, in the given
 * workspace.
 *
 * This is read-only: nothing is uploaded, removed, or otherwise modified in either the workspace
 * or the backup. It is meant as a diagnostic to run before trusting a backup (or after a restore)
 * — to find out if the workspace is missing data the backup has, without acting on it.
 *
 * Account domains (person/socialId) are skipped, since they live in the account database rather
 * than in the workspace's own domains and can't be checked against `pipeline.context.lowLevelStorage`.
 *
 * @param date optional snapshot date to check against, defaults to the latest snapshot (-1).
 * @public
 */
export async function checkWorkspaceBackup (
  ctx: MeasureContext,
  pipeline: Pipeline,
  wsIds: WorkspaceIds,
  storage: BackupStorage,
  date: number = -1
): Promise<WorkspaceCheckResult> {
  const infoFile = 'backup.json.gz'
  if (!(await storage.exists(infoFile))) {
    throw new Error(`${infoFile} should present to check`)
  }
  const backupInfo: BackupInfo = JSON.parse(gunzipSync(new Uint8Array(await storage.loadFile(infoFile))).toString())

  let snapshots = backupInfo.snapshots
  if (date !== -1) {
    const bk = backupInfo.snapshots.findIndex((it) => it.date === date)
    if (bk === -1) {
      throw new Error(`${infoFile} has no snapshot at ${date}`)
    }
    snapshots = backupInfo.snapshots.slice(0, bk + 1)
  } else {
    date = snapshots[snapshots.length - 1]?.date ?? -1
  }

  ctx.info('checking workspace against backup', { workspace: wsIds.uuid, date })

  const domains = new Set<Domain>()
  for (const s of snapshots) {
    Object.keys(s.domains).forEach((it) => domains.add(it as Domain))
  }

  const connection = pipeline.context.lowLevelStorage as LowLevelStorage
  const ops = new BackupClientOps(connection)

  const results: DomainCheckResult[] = []

  for (const domain of domains) {
    if (isAccountDomain(domain)) {
      continue
    }

    ctx.info('checking domain', { domain })
    const backupDigest = (await loadDigest(ctx, storage, snapshots, domain, date)) as Map<Ref<Doc>, string>

    const workspaceDigest = new Map<Ref<Doc>, string>()
    let idx: number | undefined
    try {
      while (true) {
        const it = await ops.loadChunk(ctx, domain, idx)
        idx = it.idx
        for (const { id, hash } of it.docs) {
          workspaceDigest.set(id as Ref<Doc>, hash)
        }
        if (it.finished) {
          break
        }
      }
    } finally {
      if (idx !== undefined) {
        await ops.closeChunk(ctx, idx)
      }
    }

    const { missing, modified } = compareDomainDigest(backupDigest, workspaceDigest)

    const result: DomainCheckResult = {
      domain,
      backupCount: backupDigest.size,
      workspaceCount: workspaceDigest.size,
      missing,
      modified
    }
    results.push(result)

    if (missing.length > 0 || modified.length > 0) {
      ctx.warn('backup data not fully present in workspace', {
        domain,
        backupCount: result.backupCount,
        workspaceCount: result.workspaceCount,
        missing: missing.length,
        modified: modified.length,
        sampleMissing: missing.slice(0, 10),
        sampleModified: modified.slice(0, 10)
      })
    } else {
      ctx.info('domain ok', { domain, count: result.backupCount })
    }
  }

  const ok = results.every((it) => it.missing.length === 0 && it.modified.length === 0)

  ctx.info('check complete', {
    workspace: wsIds.uuid,
    ok,
    domains: results.length,
    missing: results.reduce((sum, it) => sum + it.missing.length, 0),
    modified: results.reduce((sum, it) => sum + it.modified.length, 0)
  })

  return { date, domains: results, ok }
}
