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
import { MeasureContext, systemAccountUuid, type WorkspaceInfo, type Branding, type WorkspaceIds, WorkspaceInfoWithStatus } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { backupService, doBackupWorkspace } from '@hcengineering/server-backup'
import serverClientPlugin from '@hcengineering/server-client'
import { type DbConfiguration, type PipelineFactory, type StorageAdapter } from '@hcengineering/server-core'
import { buildStorageFromConfig, createStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { generateToken } from '@hcengineering/server-token'
import { config as _config } from './config'

export function startBackup (
  ctx: MeasureContext,
  pipelineFactoryFactory: (mongoUrl: string, storage: StorageAdapter) => PipelineFactory,
  getConfig: (
    ctx: MeasureContext,
    dbUrl: string,
    workspace: WorkspaceIds,
    branding: Branding | null,
    externalStorage: StorageAdapter
  ) => DbConfiguration
): void {
  const config = _config()
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverClientPlugin.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClientPlugin.metadata.UserAgent, config.ServiceID)

  const mainDbUrl = config.DbURL

  const backupStorageConfig = storageConfigFromEnv(config.Storage)
  const workspaceStorageConfig = storageConfigFromEnv(config.WorkspaceStorage)

  const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
  const workspaceStorageAdapter = buildStorageFromConfig(workspaceStorageConfig)

  const pipelineFactory = pipelineFactoryFactory(mainDbUrl, workspaceStorageAdapter)

  // A token to access account service
  const token = generateToken(systemAccountUuid, undefined, { service: 'backup' })

  const shutdown = backupService(
    ctx,
    storageAdapter,
    { ...config, Token: token },
    pipelineFactory,
    workspaceStorageAdapter,
    (ctx, workspace, branding, externalStorage) => {
      return getConfig(ctx, mainDbUrl, workspace, branding, externalStorage)
    },
    config.Region
  )

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    ctx.error('uncaughtException', { err: e })
  })
  process.on('unhandledRejection', (e) => {
    ctx.error('unhandledRejection', { err: e })
  })
}

export async function backupWorkspace (
  ctx: MeasureContext,
  workspace: WorkspaceInfoWithStatus,
  pipelineFactoryFactory: (mongoUrl: string, storage: StorageAdapter) => PipelineFactory,
  getConfig: (
    ctx: MeasureContext,
    dbUrls: string,
    workspace: WorkspaceIds,
    branding: Branding | null,
    externalStorage: StorageAdapter
  ) => DbConfiguration,
  region: string,
  freshBackup: boolean = false,
  clean: boolean = false,
  downloadLimit: number,

  onFinish?: (backupStorage: StorageAdapter, workspaceStorage: StorageAdapter) => Promise<void>
): Promise<boolean> {
  const config = _config()
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverClientPlugin.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClientPlugin.metadata.UserAgent, config.ServiceID)

  const mainDbUrl = config.DbURL

  const backupStorageConfig = storageConfigFromEnv(config.Storage)
  const workspaceStorageConfig = storageConfigFromEnv(config.WorkspaceStorage)

  const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
  const workspaceStorageAdapter = buildStorageFromConfig(workspaceStorageConfig)

  const pipelineFactory = pipelineFactoryFactory(mainDbUrl, workspaceStorageAdapter)

  // A token to access account service
  const token = generateToken(systemAccountUuid, undefined, { name: 'backup', service: 'backup' })

  try {
    const result = await doBackupWorkspace(
      ctx,
      workspace,
      storageAdapter,
      { ...config, Token: token },
      pipelineFactory,
      workspaceStorageAdapter,
      (ctx, workspace, branding, externalStorage) => {
        return getConfig(ctx, mainDbUrl, workspace, branding, externalStorage)
      },
      region,
      freshBackup,
      clean,
      downloadLimit,
      []
    )
    if (result && onFinish !== undefined) {
      await onFinish(storageAdapter, workspaceStorageAdapter)
    }
    return result
  } finally {
    await storageAdapter.close()
    await workspaceStorageAdapter.close()
  }
}
