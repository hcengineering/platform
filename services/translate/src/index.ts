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
import { newMetrics, Tx } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import { initStatisticsContext, QueueTopic } from '@hcengineering/server-core'
import serverToken from '@hcengineering/server-token'
import OpenAI from 'openai'
import { join } from 'path'

import config from './config'
import { Controller } from './conroller'
import { extractCreateMessageData, extractRemoveMessageData, extractUpdateMessageData } from './utils'

async function main (): Promise<void> {
  configureAnalytics(config.ServiceId, process.env.VERSION ?? '0.7.0')
  const ctx = initStatisticsContext(config.ServiceId, {
    factory: () =>
      createOpenTelemetryMetricsContext(
        config.ServiceId,
        {},
        {},
        newMetrics(),
        new SplitLogger(config.ServiceId, {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  Analytics.setTag('application', config.ServiceId)
  setMetadata(serverToken.metadata.Secret, config.Secret)
  setMetadata(serverToken.metadata.Service, config.ServiceId)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsUrl)

  const openai = new OpenAI({
    apiKey: config.OpenAIKey,
    baseURL: config.OpenAIBaseUrl === '' ? undefined : config.OpenAIBaseUrl
  })

  const queue = getPlatformQueue(config.ServiceId, config.QueueRegion)
  const controller = new Controller(ctx, openai)

  const consumer = queue.createConsumer<Tx>(ctx, QueueTopic.Tx, queue.getClientId(), async (ctx, queueMessage) => {
    const ws = queueMessage.workspace
    const tx = queueMessage.value

    controller.processTranslationSettingsTx(ws, tx)

    const createMessageData = extractCreateMessageData(tx)
    const updateMessageData = extractUpdateMessageData(tx)
    const removeMessageData = extractRemoveMessageData(tx)

    if (createMessageData != null) {
      const { message, blobId } = createMessageData
      await controller.processMessageCreate(ctx.newChild('translate', {}), ws, message, blobId)
    }

    if (updateMessageData != null) {
      const { cardId, content, blobId, messageId } = updateMessageData
      await controller.processMessageUpdate(ctx.newChild('translate', {}), ws, cardId, messageId, content, blobId)
    }

    if (removeMessageData != null) {
      const { messageId, blobId, cardId } = removeMessageData
      await controller.processMessageRemove(ctx.newChild('translate', {}), ws, cardId, messageId, blobId)
    }
  })

  const shutdown = (): void => {
    void Promise.all([consumer.close()]).then(() => {
      process.exit()
    })
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)
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
