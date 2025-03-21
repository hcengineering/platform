/* eslint-disable @typescript-eslint/unbound-method */
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

import { type Account, type BrandingMap, type MeasureContext, type Tx } from '@hcengineering/core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'

import { ClientSession, startSessionManager } from '@hcengineering/server'
import {
  type ServerFactory,
  type Session,
  type SessionManager,
  type StorageConfiguration,
  type Workspace,
  type PlatformQueue
} from '@hcengineering/server-core'
import { type Token } from '@hcengineering/server-token'

import {
  createServerPipeline,
  isAdapterSecurity,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity,
  sharedPipelineContextVars
} from '@hcengineering/server-pipeline'
import { uncompress } from 'snappy'

import {
  createMongoAdapter,
  createMongoDestroyAdapter,
  createMongoTxAdapter,
  shutdownMongo
} from '@hcengineering/mongo'
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  registerGreenDecoder,
  registerGreenUrl,
  setDBExtraOptions,
  shutdownPostgres
} from '@hcengineering/postgres'
import { readFileSync } from 'node:fs'
const model = JSON.parse(readFileSync(process.env.MODEL_JSON ?? 'model.json').toString()) as Tx[]

registerStringLoaders()

// Register close on process exit.
process.on('exit', () => {
  shutdownPostgres(sharedPipelineContextVars).catch((err) => {
    console.error(err)
  })
  shutdownMongo(sharedPipelineContextVars).catch((err) => {
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
    serverFactory: ServerFactory

    enableCompression?: boolean

    accountsUrl: string

    profiling?: {
      start: () => void
      stop: () => Promise<string | undefined>
    }

    mongoUrl?: string
  }
): { shutdown: () => Promise<void>, sessionManager: SessionManager } {
  registerTxAdapterFactory('mongodb', createMongoTxAdapter)
  registerAdapterFactory('mongodb', createMongoAdapter)
  registerDestroyFactory('mongodb', createMongoDestroyAdapter)

  registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
  registerAdapterFactory('postgresql', createPostgresAdapter, true)
  registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
  setAdapterSecurity('postgresql', true)

  const usePrepare = (process.env.DB_PREPARE ?? 'true') === 'true'

  registerGreenDecoder('snappy', uncompress)
  registerGreenUrl(process.env.GREEN_URL)

  setDBExtraOptions({
    prepare: usePrepare // We override defaults
  })

  registerServerPlugins()

  const externalStorage = buildStorageFromConfig(opt.storageConfig)

  const pipelineFactory = createServerPipeline(
    metrics,
    dbUrl,
    model,
    { ...opt, externalStorage, adapterSecurity: isAdapterSecurity(dbUrl), queue: opt.queue },
    {}
  )
  const sessionFactory = (token: Token, workspace: Workspace, account: Account): Session => {
    return new ClientSession(token, workspace, account, token.extra?.mode === 'backup')
  }

  const { shutdown: onClose, sessionManager } = startSessionManager(metrics, {
    pipelineFactory,
    sessionFactory,
    port: opt.port,
    brandingMap: opt.brandingMap,
    serverFactory: opt.serverFactory,
    enableCompression: opt.enableCompression,
    accountsUrl: opt.accountsUrl,
    externalStorage,
    profiling: opt.profiling,
    queue: opt.queue
  })
  return {
    shutdown: async () => {
      await externalStorage.close()
      await onClose()
    },
    sessionManager
  }
}
