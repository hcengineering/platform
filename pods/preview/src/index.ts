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

import { Analytics } from '@hcengineering/analytics'
import { configureAnalytics, createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import { initStatisticsContext } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'

import config from './config'
import { createServer, listen } from './server'

const application = config.ServiceID

const setupMetadata = (): void => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, config.ServiceID)
  // setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  // setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
}

async function main (): Promise<void> {
  setupMetadata()

  configureAnalytics(application, process.env.VERSION ?? '0.7.0')
  Analytics.setTag('application', application)

  const ctx = initStatisticsContext(application, {
    factory: () =>
      createOpenTelemetryMetricsContext(
        application,
        {},
        {},
        newMetrics(),
        new SplitLogger(application, {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  const { app, close } = await createServer(ctx, config)
  const server = listen(app, config.Port)

  const shutdown = (): void => {
    try {
      server.close()
      close()

      ctx.info('Shutdown complete')
      process.exit(0)
    } catch (error) {
      ctx.error('Error during shutdown', { error })
      process.exit(1)
    }
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (error: any) => {
    ctx.error('Uncaught exception', { error })
  })
  process.on('unhandledRejection', (error: any) => {
    ctx.error('Unhandled rejection', { error })
  })
}

void main().catch((err) => {
  console.error(err)
})
