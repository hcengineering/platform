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

import { MeasureContext, systemAccountEmail } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { backupService } from '@hcengineering/server-backup'
import serverClientPlugin from '@hcengineering/server-client'
import { type PipelineFactory, type StorageAdapter } from '@hcengineering/server-core'
import { buildStorageFromConfig, createStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { generateToken } from '@hcengineering/server-token'
import config from './config'

export function startBackup (
  ctx: MeasureContext,
  pipelineFactoryFactory: (mongoUrl: string, storage: StorageAdapter) => PipelineFactory
): void {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverClientPlugin.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClientPlugin.metadata.UserAgent, config.ServiceID)

  const backupStorageConfig = storageConfigFromEnv(config.Storage)
  const workspaceStorageConfig = storageConfigFromEnv(config.WorkspaceStorage)

  const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
  const workspaceStorageAdapter = buildStorageFromConfig(workspaceStorageConfig, config.MongoURL)

  const pipelineFactory = pipelineFactoryFactory(config.MongoURL, workspaceStorageAdapter)

  // A token to access account service
  const token = generateToken(systemAccountEmail, { name: 'backup' })

  const shutdown = backupService(
    ctx,
    storageAdapter,
    { ...config, Token: token },
    pipelineFactory,
    workspaceStorageAdapter
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
