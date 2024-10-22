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
import serverNotification from '@hcengineering/server-notification'
import serverToken from '@hcengineering/server-token'
import toolPlugin from '@hcengineering/server-tool'
import { WorkspaceWorker } from './service'

export * from './ws-operations'

/**
 * @public
 */
export function serveWorkspaceAccount (
  measureCtx: MeasureContext,
  version: Data<Version>,
  txes: Tx[],
  migrateOperations: [string, MigrateOperation][],
  brandings: BrandingMap,
  onClose?: () => void
): void {
  const region = process.env.REGION ?? ''
  const wsOperation = process.env.WS_OPERATION ?? 'all'
  if (wsOperation !== 'all' && wsOperation !== 'create' && wsOperation !== 'upgrade') {
    console.log(`Invalid operation provided: ${wsOperation}. Must be one of 'all', 'create', 'upgrade'`)
    process.exit(1)
  }

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

  // Required by the tool
  const dbUri = process.env.MONGO_URL
  if (dbUri === undefined) {
    console.log('Please provide mongodb url')
    process.exit(1)
  }

  const waitTimeout = parseInt(process.env.WAIT_TIMEOUT ?? '5000')

  setMetadata(serverToken.metadata.Secret, serverSecret)

  const initWS = process.env.INIT_WORKSPACE
  if (initWS !== undefined) {
    setMetadata(toolPlugin.metadata.InitWorkspace, initWS)
  }
  const initScriptUrl = process.env.INIT_SCRIPT_URL
  if (initScriptUrl !== undefined) {
    setMetadata(toolPlugin.metadata.InitScriptURL, initScriptUrl)
  }
  setMetadata(serverClientPlugin.metadata.UserAgent, 'WorkspaceService')

  setMetadata(serverNotification.metadata.InboxOnlyNotifications, true)

  let canceled = false

  const worker = new WorkspaceWorker(
    version,
    txes,
    migrateOperations,
    region,
    parseInt(process.env.PARALLEL ?? '1'),
    wsOperation,
    brandings
  )

  void worker.start(
    measureCtx,
    {
      errorHandler: async (ws, err) => {
        Analytics.handleError(err)
      },
      force: false,
      console: false,
      logs: 'upgrade-logs',
      waitTimeout
    },
    () => canceled
  )

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
