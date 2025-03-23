//
// Copyright © 2024 Hardcore Engineering Inc.
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

import { Analytics } from '@hcengineering/analytics'
import {
  versionToString,
  type BrandingMap,
  type Data,
  type MeasureContext,
  type Tx,
  type Version
} from '@hcengineering/core'
import { type MigrateOperation } from '@hcengineering/model'
import { setMetadata } from '@hcengineering/platform'
import serverClientPlugin from '@hcengineering/server-client'
import { QueueTopic, type PlatformQueue, type QueueWorkspaceMessage } from '@hcengineering/server-core'
import serverNotification from '@hcengineering/server-notification'
import { createStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken from '@hcengineering/server-token'
import toolPlugin from '@hcengineering/server-tool'
import { WorkspaceWorker, type WorkspaceOperation } from './service'

export * from './ws-operations'
/**
 * @public
 */
export function serveWorkspaceAccount (
  measureCtx: MeasureContext,
  queue: PlatformQueue,
  version: Data<Version>,
  txes: Tx[],
  migrateOperations: [string, MigrateOperation][],
  brandings: BrandingMap,
  onClose?: () => void
): void {
  const region = process.env.REGION ?? ''
  const wsOperation: WorkspaceOperation = (process.env.WS_OPERATION as WorkspaceOperation) ?? 'all'
  if (wsOperation !== 'all' && wsOperation !== 'create' && wsOperation !== 'upgrade' && wsOperation !== 'all+backup') {
    console.log(
      `Invalid operation provided: ${wsOperation as string}. 
      Must be one of 'all', 'create', 'upgrade', 'all+backup'`
    )
    process.exit(1)
  }

  if (wsOperation === 'all+backup' && process.env.BACKUP_STORAGE === undefined) {
    console.log('BACKUP_STORAGE is required for all operation')
    process.exit(1)
  }

  if (wsOperation === 'all+backup' && process.env.BACKUP_BUCKET === undefined) {
    console.log('BACKUP_BUCKET is required for all operation')
    process.exit(1)
  }

  if (process.env.MIGRATION_CLEANUP !== 'true') {
    console.log('Migration cleanup is not set, so move to regions will not clean old DB.')
  }

  const backup =
    wsOperation === 'all+backup'
      ? {
          backupStorage: createStorageFromConfig(storageConfigFromEnv(process.env.BACKUP_STORAGE ?? '').storages[0]),
          bucketName: process.env.BACKUP_BUCKET ?? 'backup'
        }
      : undefined

  console.log(
    'Starting workspace service in region:',
    region === '' ? 'DEFAULT' : region,
    'for operation:',
    wsOperation,
    'for version:',
    versionToString(version),
    'with brandings:',
    brandings
  )

  const accountUri = process.env.ACCOUNTS_URL
  if (accountUri === undefined) {
    console.log('Please provide account url')
    process.exit(1)
  }
  setMetadata(serverClientPlugin.metadata.Endpoint, accountUri)

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.log('Please provide server secret')
    process.exit(1)
  }

  const waitTimeout = parseInt(process.env.WAIT_TIMEOUT ?? '5000')

  setMetadata(serverToken.metadata.Secret, serverSecret)

  const initWS = process.env.INIT_WORKSPACE
  if (initWS !== undefined) {
    setMetadata(toolPlugin.metadata.InitWorkspace, initWS)
  }

  const initRepoDir = process.env.INIT_REPO_DIR ?? './init-scripts'
  setMetadata(toolPlugin.metadata.InitRepoDir, initRepoDir)

  setMetadata(serverClientPlugin.metadata.UserAgent, 'WorkspaceService')
  setMetadata(serverNotification.metadata.InboxOnlyNotifications, true)

  const fulltextUrl = process.env.FULLTEXT_URL
  if (fulltextUrl === undefined) {
    console.log('Please provide fulltext url to be able to clean fulltext index')
  }

  let canceled = false

  const worker = new WorkspaceWorker(
    queue.createProducer<QueueWorkspaceMessage>(measureCtx, QueueTopic.Workspace),
    version,
    txes,
    migrateOperations,
    region,
    parseInt(process.env.PARALLEL ?? '1'),
    wsOperation,
    brandings,
    fulltextUrl,
    accountUri
  )

  void worker
    .start(
      measureCtx,
      {
        errorHandler: async (ws, err) => {
          Analytics.handleError(err)
        },
        force: false,
        console: false,
        logs: 'upgrade-logs',
        waitTimeout,
        backup
      },
      () => canceled
    )
    .catch((err) => {
      measureCtx.error('failed to start', { err })
    })

  const close = (): void => {
    canceled = true
    onClose?.()
  }

  process.on('uncaughtException', (e) => {
    measureCtx.error('uncaughtException', { error: e })
  })

  process.on('unhandledRejection', (reason, promise) => {
    measureCtx.error('Unhandled Rejection at:', { reason, promise })
  })
  process.on('SIGINT', close)
  process.on('SIGTERM', close)
  process.on('exit', close)
}
