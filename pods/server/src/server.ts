/* eslint-disable @typescript-eslint/unbound-method */
//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { type BrandingMap, type MeasureContext, type Ref, type Tx } from '@hcengineering/core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'

import { startSessionManager } from '@hcengineering/server'
import { type PlatformQueue, type SessionManager, type StorageConfiguration } from '@hcengineering/server-core'

import {
  createServerPipeline,
  isAdapterSecurity,
  matchLastTxLoader,
  registerAdapterFactory,
  registerDestroyFactory,
  registerLastTxLoader,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity
} from '@hcengineering/server-pipeline'

import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  loadLastTxCache,
  setDBExtraOptions,
  shutdownPostgres
} from '@hcengineering/postgres'
import { readFileSync } from 'node:fs'
import { startHttpServer } from './server_http'

const model = JSON.parse(readFileSync(process.env.MODEL_JSON ?? 'model.json').toString()) as Tx[]

registerStringLoaders()

// Register close on process exit.
process.on('exit', () => {
  shutdownPostgres().catch((err) => {
    console.error(err)
  })
})
/**
 * @public
 */
export function start (
  metrics: MeasureContext,
  dbUrl: string,
  opt: {
    queue: PlatformQueue
    fulltextUrl: string
    storageConfig: StorageConfiguration
    port: number
    brandingMap: BrandingMap

    enableCompression?: boolean

    accountsUrl: string

    profiling?: {
      start: () => void
      stop: () => Promise<string | undefined>
    }
  }
): { shutdown: () => Promise<void>, sessionManager: SessionManager } {
  registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
  registerAdapterFactory('postgresql', createPostgresAdapter, true)
  registerLastTxLoader('postgresql', loadLastTxCache)
  registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
  setAdapterSecurity('postgresql', true)
  setAdapterSecurity('postgres://', true)

  const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

  setDBExtraOptions({
    prepare: usePrepare // We override defaults
  })

  registerServerPlugins()

  const externalStorage = buildStorageFromConfig(opt.storageConfig)

  // Seed each workspace's context.lastTx on cold build so a restart with no data change
  // reconnects clients as Reconnected, not Refresh (full LiveQuery refetch). Empty until loaded = safe.
  const lastTxCache = new Map<string, Ref<Tx>>()
  // Feature-detect: backends that registered a loader fill the cache; others skip -> Refresh.
  const lastTxLoader = matchLastTxLoader(dbUrl)
  if (lastTxLoader !== undefined) void lastTxLoader(metrics, dbUrl, lastTxCache)

  const pipelineFactory = createServerPipeline(
    metrics,
    dbUrl,
    model,
    {
      ...opt,
      externalStorage,
      adapterSecurity: isAdapterSecurity(dbUrl),
      queue: opt.queue,
      pipelineContextVars: { lastTxCache }
    },
    {}
  )

  const sessionManager = startSessionManager(metrics, {
    pipelineFactory,
    brandingMap: opt.brandingMap,
    enableCompression: opt.enableCompression,
    accountsUrl: opt.accountsUrl,
    profiling: opt.profiling,
    queue: opt.queue
  })
  const shutdown = startHttpServer(metrics, sessionManager, opt.port, opt.accountsUrl, externalStorage)
  return {
    shutdown: async () => {
      await externalStorage.close()
      await sessionManager.closeWorkspaces(metrics)
      await shutdown()
    },
    sessionManager
  }
}
