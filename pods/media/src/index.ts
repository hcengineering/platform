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
import { configureAnalytics, SplitLogger } from '@hcengineering/analytics-service'
import { Doc, MeasureMetricsContext, TxCUD, newMetrics } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import { join } from 'path'

import config from './config'
import { handleTranscodeResult, handleTx } from './handler'
import { VideoTranscodeRequest, VideoTranscodeResult } from './types'

const application = 'media'
const topicTranscodeRequest = 'stream.transcode.request'
const topicTranscodeResult = 'stream.transcode.result'

const setupMetadata = (): void => {
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, 'media')
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
}

async function main (): Promise<void> {
  setupMetadata()

  configureAnalytics(process.env.SENTRY_DSN, {})
  Analytics.setTag('application', application)

  const ctx = initStatisticsContext(application, {
    factory: () =>
      new MeasureMetricsContext(
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

  const queue = getPlatformQueue(application)
  await queue.createTopic([topicTranscodeRequest, topicTranscodeResult], config.Partitions)

  const transcodeProducer = queue.getProducer<VideoTranscodeRequest>(ctx, topicTranscodeRequest)

  queue.createConsumer<VideoTranscodeResult>(ctx, topicTranscodeResult, application, async (msgs) => {
    for (const msg of msgs) {
      for (const res of msg.value) {
        await handleTranscodeResult(ctx, msg.workspace, res)
      }
    }
  })

  queue.createConsumer<TxCUD<Doc>>(ctx, QueueTopic.Tx, queue.getClientId(), async (msgs) => {
    for (const msg of msgs) {
      const workspaceUuid = msg.workspace
      for (const tx of msg.value) {
        await handleTx(ctx, workspaceUuid, tx, transcodeProducer)
      }
    }
  })

  const shutdownAsync = async (): Promise<void> => {
    await queue.shutdown()
  }

  const shutdown = (): void => {
    void shutdownAsync()
      .then(() => {
        ctx.info('Shutdown complete')
        process.exit(0)
      })
      .catch((error) => {
        ctx.error('Error during shutdown', { error })
        process.exit(1)
      })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
  process.on('uncaughtException', (error: any) => {
    ctx.error('Uncaught exception', { error })
  })
  process.on('unhandledRejection', (error: any) => {
    ctx.error('Unhandled rejection', { error })
  })

  await new Promise(() => {})
}

void main().catch((err) => {
  console.error(err)
})
