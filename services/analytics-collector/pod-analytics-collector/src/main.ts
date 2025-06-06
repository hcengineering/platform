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
import { SplitLogger, configureAnalytics } from '@hcengineering/analytics-service'
import { MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { join } from 'path'

import config from './config'
import { initStatisticsContext } from '@hcengineering/server-core'

const ctx = initStatisticsContext('analytics-collector', {
  factory: () =>
    new MeasureMetricsContext(
      'analytics-collector-service',
      {},
      {},
      newMetrics(),
      new SplitLogger('analytics-collector-service', {
        root: join(process.cwd(), 'logs'),
        enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
      })
    )
})

configureAnalytics(config.SentryDSN, config)
Analytics.setTag('application', 'analytics-collector-service')

export const main = async (): Promise<void> => {
  ctx.info('Analytics collector service is not implemented yet')
  process.exit()
  // setMetadata(serverToken.metadata.Secret, config.Secret)
  // setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  // setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  //
  // ctx.info('Analytics service started', {
  //   accountsUrl: config.AccountsUrl
  // })
  //
  // registerLoaders()
  //
  // const db = await getDB()
  // const collector = new Collector(ctx, db)
  //
  // const app = createServer(collector)
  // const server = listen(app, config.Port)
  //
  // const shutdown = (): void => {
  //   void collector.close()
  //   void closeDB()
  //   server.close(() => process.exit())
  // }
  //
  // process.on('SIGINT', shutdown)
  // process.on('SIGTERM', shutdown)
  // process.on('uncaughtException', (e) => {
  //   console.error(e)
  // })
  // process.on('unhandledRejection', (e) => {
  //   console.error(e)
  // })
}
