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
import { shutdownPostgres } from '@hcengineering/postgres'
import {
  startSessionManager,
  type ServerEnv,
  type TickHandler,
  type Workspace,
  type WorkspaceFactory
} from '@hcengineering/server'
import {
  loadBrandingMap,
  type BroadcastOps,
  type ConnectionSocket,
  type LoadChunkResult,
  type PlatformQueue,
  type Session,
  type SessionManager,
  type StorageConfiguration,
  type WorkspaceStatistics
} from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { profileStart, profileStop } from './inspector'

import {
  type Account,
  type Branding,
  type BrandingMap,
  type Class,
  type Doc,
  type DocumentQuery,
  type Domain,
  type DomainParams,
  type DomainResult,
  type FindOptions,
  type FindResult,
  type LoadModelResponse,
  type MeasureContext,
  type OperationDomain,
  type Ref,
  type SearchOptions,
  type SearchQuery,
  type SearchResult,
  type SocialStringsToUsers,
  type Timestamp,
  type Tx,
  type TxResult,
  type WorkspaceIds
} from '@hcengineering/core'

import { createNetworkClient } from '@hcengineering/network-client'

import { registerServerPlugins, registerStringLoaders } from '@hcengineering/server-pipeline'

import { shutdownMongo } from '@hcengineering/mongo'
import { WorkspaceServiceClient } from '@hcengineering/net-workspace'
import type { NetworkClient } from '@hcengineering/network-core'
import type { Token } from '@hcengineering/server-token'
import { getWorkspaceConfig } from './config'
import { startHttpServer } from './server_http'

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

export function startEndpointServer (metricsContext: MeasureContext, networkHost: string): () => WorkspaceStatistics[] {
  const {
    config,
    storageConfig,
    queue
  }: { config: ServerEnv, storageConfig: StorageConfiguration, queue: PlatformQueue } = getWorkspaceConfig(
    'endpoint',
    true
  )

  const networkClient = createNetworkClient(networkHost)

  const { shutdown, sessionManager } = startEndpoint(metricsContext, networkClient, {
    storageConfig,
    port: config.serverPort,
    brandingMap: loadBrandingMap(config.brandingPath),
    accountsUrl: config.accountsUrl,
    version: process.env.VERSION ?? '0.7.0',
    region: process.env.REGION,
    enableCompression: config.enableCompression,
    profiling: {
      start: profileStart,
      stop: profileStop
    },
    queue
  })

  const getStats = (): WorkspaceStatistics[] => {
    return sessionManager.getStatistics()
  }

  const close = (): void => {
    console.trace('Exiting from server')
    console.log('Shutdown request accepted')
    void queue.shutdown()
    void networkClient.close()
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
export function startEndpoint (
  metrics: MeasureContext,
  client: NetworkClient,
  opt: {
    queue: PlatformQueue
    storageConfig: StorageConfiguration
    port: number
    brandingMap: BrandingMap
    version: string
    region?: string

    enableCompression?: boolean

    accountsUrl: string

    profiling?: {
      start: () => void
      stop: () => Promise<string | undefined>
    }
  }
): { shutdown: () => Promise<void>, sessionManager: SessionManager } {
  registerServerPlugins()

  const externalStorage = buildStorageFromConfig(opt.storageConfig)

  const workspaceFactory: WorkspaceFactory = (ctx, { ids, version, broadcast, branding, region }) => {
    return new EPWorkspace(client, ctx, ids, version, broadcast, branding, region)
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

class EPWorkspace implements Workspace {
  service: WorkspaceServiceClient
  workspaceInitCompleted: boolean = false
  maintenance: boolean = false
  closing?: Promise<void>

  tickHandlers = new Map<string, TickHandler>()

  operations: number = 0

  softShutdown: number = 0
  tickHash: number = 0

  socialStringsToUsers: SocialStringsToUsers = new Map()

  get sessions (): Map<string, { session: Session, socket: ConnectionSocket, tickHash: number }> {
    return this.service.sessions
  }

  constructor (
    readonly client: NetworkClient,
    readonly context: MeasureContext,
    readonly wsId: WorkspaceIds,
    readonly version: string,
    readonly broadcast: BroadcastOps,
    readonly branding: Branding | null,
    readonly region: string
  ) {
    this.service = new WorkspaceServiceClient(
      client,
      context,
      wsId,
      version,
      broadcast,
      this.socialStringsToUsers,
      branding,
      region
    )
  }

  async close (ctx: MeasureContext): Promise<void> {
    await this.service.close(ctx)
  }

  async createSession (ctx: MeasureContext, sessionId: string, token: Token, account: Account): Promise<Session> {
    return await this.service.createSession(ctx, sessionId, token, account)
  }

  async closeSession (ctx: MeasureContext, session: Session): Promise<void> {
    await this.service.closeSession(ctx, session)
  }

  findAll<T extends Doc>(
    ctx: MeasureContext,
    client: Session,
    _class: Ref<Class<T>>,
    query: DocumentQuery<T>,
    options?: FindOptions<T>
  ): Promise<FindResult<T>> {
    return this.service.findAll(ctx, client, _class, query, options)
  }

  tx (ctx: MeasureContext, session: Session, tx: Tx, onResult?: (result: TxResult) => Promise<void>): Promise<TxResult> {
    return this.service.tx(ctx, session, tx, onResult)
  }

  domainRequest (
    ctx: MeasureContext,
    session: Session,
    domain: OperationDomain,
    params: DomainParams,
    onResult?: (result: DomainResult) => Promise<void>
  ): Promise<DomainResult> {
    return this.service.domainRequest(ctx, session, domain, params, onResult)
  }

  loadChunk (ctx: MeasureContext, session: Session, domain: Domain, idx?: number): Promise<LoadChunkResult> {
    return this.service.loadChunk(ctx, session, domain, idx)
  }

  closeChunk (ctx: MeasureContext, session: Session, idx: number): Promise<void> {
    return this.service.closeChunk(ctx, session, idx)
  }

  upload (ctx: MeasureContext, session: Session, domain: Domain, docs: Doc[]): Promise<void> {
    // TODO: Should we split docs to smaller?
    return this.service.upload(ctx, session, domain, docs)
  }

  loadDocs (ctx: MeasureContext, session: Session, domain: Domain, docs: Ref<Doc>[]): Promise<Doc[]> {
    return this.service.loadDocs(ctx, session, domain, docs)
  }

  loadModel (
    ctx: MeasureContext,
    session: Session,
    lastModelTx: Timestamp,
    hash?: string,
    filter?: boolean
  ): Promise<LoadModelResponse | Tx[]> {
    return this.service.loadModel(ctx, session, lastModelTx, hash, filter)
  }

  searchFulltext (
    ctx: MeasureContext,
    session: Session,
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult> {
    return this.service.searchFulltext(ctx, session, query, options)
  }

  getLastTxHash (ctx: MeasureContext): Promise<{ lastTx?: string, lastHash?: string }> {
    return this.service.getLastTxHash(ctx)
  }

  getDomainHash (ctx: MeasureContext, domain: Domain): Promise<string> {
    return this.service.getDomainHash(ctx, domain)
  }

  clean (ctx: MeasureContext, session: Session, domain: Domain, docs: Ref<Doc>[]): Promise<void> {
    return this.service.clean(ctx, session, domain, docs)
  }
}
