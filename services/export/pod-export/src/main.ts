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

import { newMetrics, type Tx } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import serverToken from '@hcengineering/server-token'
import { storageConfigFromEnv } from '@hcengineering/server-storage'
import builder, { getModelVersion } from '@hcengineering/model-all'
import { initStatisticsContext } from '@hcengineering/server-core'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { join } from 'path'
import { registerAdapterFactory, registerTxAdapterFactory } from '@hcengineering/server-pipeline'
import { createPostgresAdapter, createPostgresTxAdapter } from '@hcengineering/postgres'

import config from './config'
import { createServer, listen } from './server'

registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
registerAdapterFactory('postgresql', createPostgresAdapter, true)

const setupMetadata = (): void => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, 'export')
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
}

export const main = async (): Promise<void> => {
  setupMetadata()

  configureAnalytics('export', process.env.VERSION ?? '0.7.0')
  const metricsContext = initStatisticsContext('export', {
    factory: () =>
      createOpenTelemetryMetricsContext(
        'export',
        {},
        {},
        newMetrics(),
        new SplitLogger('export', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  // Load model from JSON file
  const model = JSON.parse(JSON.stringify(builder().getTxes())) as Tx[]
  metricsContext.info(`Loaded model transactions, version: ${JSON.stringify(getModelVersion())}`)

  const storageConfig = storageConfigFromEnv()
  const { app, close } = createServer(storageConfig, config.DbURL, model, metricsContext)
  const server = listen(app, config.Port, metricsContext)

  const shutdown = (): void => {
    close()
    server.close(() => process.exit())
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (e) => {
    metricsContext.error('uncaughtException', { err: e })
  })
  process.on('unhandledRejection', (e) => {
    metricsContext.error('unhandledRejection', { err: e })
  })
}
