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

// Add this to the VERY top of the first file loaded in your app
import {
  createPostgreeDestroyAdapter,
  createPostgresAdapter,
  createPostgresTxAdapter,
  setDBExtraOptions,
  shutdownPostgres
} from '@hcengineering/postgres'
import { type ServerEnv } from '@hcengineering/server'
import {
  loadBrandingMap,
  type CommunicationApiFactory,
  type Pipeline,
  type PlatformQueue,
  type SessionManager,
  type StorageConfiguration,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { profileStart, profileStop } from './inspector'

import { type BrandingMap, type MeasureContext, type Tx } from '@hcengineering/core'

import { startSessionManager } from '@hcengineering/server'

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
import type { WorkspaceFactory } from '@hcengineering/server/types/types'
import { readFileSync } from 'node:fs'
import { getWorkspaceConfig } from './config'
import { startHttpServer } from './server_http'
import { WorkspaceImpl } from './workspace'
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

export function startStandaloneServer (metricsContext: MeasureContext): () => WorkspaceStatistics[] {
  const {
    config,
    storageConfig,
    queue
  }: { config: ServerEnv, storageConfig: StorageConfiguration, queue: PlatformQueue } = getWorkspaceConfig('standalone')

  const { shutdown, sessionManager } = startStandalone(metricsContext, config.dbUrl, {
    fulltextUrl: config.fulltextUrl,
    storageConfig,
    port: config.serverPort,
    brandingMap: loadBrandingMap(config.brandingPath),
    accountsUrl: config.accountsUrl,
    enableCompression: config.enableCompression,
    communicationApiEnabled: process.env.COMMUNICATION_API_ENABLED === 'true',
    profiling: {
      start: profileStart,
      stop: profileStop
    },
    mongoUrl: config.mongoUrl,
    queue
  })

  const getStats = (): WorkspaceStatistics[] => {
    return sessionManager.getStatistics()
  }

  const close = (): void => {
    console.trace('Exiting from server')
    console.log('Shutdown request accepted')
    void queue.shutdown()
    void shutdown().then(() => {
      process.exit(0)
    })
  }
  process.on('unhandledRejection', (reason, promise) => {
    metricsContext.error('Unhandled Rejection at:', { reason, promise })
  })

  global.process.on('uncaughtException', (error, origin) => {
    metricsContext.error('Uncaught Exception at:', { origin, error })
  })

  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  return getStats
}

/**
 * @public
 */
export function startStandalone (
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
        findMessagesMeta: async () => [],
        findMessagesGroups: async () => [],
        findNotificationContexts: async () => [],
        findCollaborators: async () => [],
        findNotifications: async () => [],
        findLabels: async () => [],
        findPeers: async () => [],
        subscribeCard: () => {},
        unsubscribeCard: () => {},
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

  const workspaceFactory: WorkspaceFactory = (ctx, { pipelineCtx, broadcast, ids, branding }) => {
    const factory = async (): Promise<Pipeline> => {
      const pipeline = await pipelineFactory(pipelineCtx, ids, broadcast, branding)
      return pipeline
    }
    return new WorkspaceImpl(ctx, factory, ids, branding)
  }

  const sessionManager = startSessionManager(metrics, {
    workspaceFactory,
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
