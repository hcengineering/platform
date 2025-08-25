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

import { type BrandingMap, type MeasureContext, type Tx } from '@hcengineering/core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'

import { startSessionManager } from '@hcengineering/server'
import {
  type CommunicationApiFactory,
  type PlatformQueue,
  type SessionManager,
  type StorageConfiguration
} from '@hcengineering/server-core'

import { Api as CommunicationApi } from '@hcengineering/communication-server'
import {
  createServerPipeline,
  isAdapterSecurity,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory,
  setAdapterSecurity
} from '@hcengineering/server-pipeline'

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
  shutdownMongo().catch((err) => {
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
    communicationApiEnabled: boolean

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

  setDBExtraOptions({
    prepare: usePrepare // We override defaults
  })

  registerServerPlugins()

  const externalStorage = buildStorageFromConfig(opt.storageConfig)

  const communicationApiFactory: CommunicationApiFactory = async (ctx, workspace, broadcastSessions) => {
    if (dbUrl.startsWith('mongodb') || !opt.communicationApiEnabled) {
      return {
        findMessages: async () => [],
        findMessagesGroups: async () => [],
        findNotificationContexts: async () => [],
        findCollaborators: async () => [],
        findNotifications: async () => [],
        findLabels: async () => [],
        findThreads: async () => [],
        findPeers: async () => [],
        unsubscribeQuery: async () => {},
        event: async () => {
          return {}
        },
        closeSession: async () => {},
        close: async () => {}
      }
    }

    return await CommunicationApi.create(
      ctx.newChild('💬 communication api', {}, { span: false }),
      workspace.uuid,
      dbUrl,
      broadcastSessions
    )
  }
  const pipelineFactory = createServerPipeline(
    metrics,
    dbUrl,
    model,
    { ...opt, externalStorage, adapterSecurity: isAdapterSecurity(dbUrl), queue: opt.queue, communicationApiFactory },
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
