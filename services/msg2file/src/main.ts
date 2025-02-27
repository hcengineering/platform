//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import cron from 'node-cron'

import config from './config'
import { job } from './worker'
import { startServer } from './server'

export const main = async (): Promise<void> => {
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const ctx = initStatisticsContext('msg2file', {})
  const server = startServer(ctx)

  const task = cron.schedule('0 0 * * *', () => {
    void job(ctx)
  })

  // TODO: remove this
  void job(ctx)

  const shutdown = (): void => {
    task.stop()
    server.close(() => process.exit())
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e) => {
    console.error(e)
  })
}
