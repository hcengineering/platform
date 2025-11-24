//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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
import serverClient, { withRetry } from '@hcengineering/server-client'
import {
  initStatisticsContext,
  QueueTopic,
  QueueWorkspaceEvent,
  QueueWorkspaceMessage
} from '@hcengineering/server-core'
import serverToken, { generateToken } from '@hcengineering/server-token'

import { getClient as getAccountClient } from '@hcengineering/account-client'
import { AIEventRequest } from '@hcengineering/ai-bot'
import { createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import { newMetrics, type SocialId } from '@hcengineering/core'
import { getPlatformQueue } from '@hcengineering/kafka'
import { join } from 'path'
import { updateDeepgramBilling } from './billing'
import config from './config'
import { AIControl } from './controller'
import { registerLoaders } from './loaders'
import { createServer, listen } from './server/server'
import { getAccountUuid } from './utils/account'

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.ServerSecret)
  setMetadata(serverToken.metadata.Service, 'ai-bot-service')
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)

  registerLoaders()

  const queue = getPlatformQueue(QueueTopic.AIQueue)

  const ctx = initStatisticsContext('ai-bot-service', {
    factory: () =>
      createOpenTelemetryMetricsContext(
        'ai-bot-service',
        {},
        {},
        newMetrics(),
        new SplitLogger('ai-bot-service', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })
  ctx.info('AI Bot Service started', { firstName: config.FirstName, lastName: config.LastName })

  const personUuid = await withRetry(
    async () => await getAccountUuid(ctx),
    (_, attempt) => attempt >= 5,
    5000
  )()

  if (personUuid === undefined) {
    ctx.error('AI Bot Service failed to start. No person found.')
    process.exit()
  }
  ctx.info('AI person uuid', { personUuid })

  const socialIds: SocialId[] = await getAccountClient(
    config.AccountsURL,
    generateToken(personUuid, undefined, { service: 'aibot' })
  ).getSocialIds()

  const aiControl = new AIControl(personUuid, socialIds, ctx)

  // Create a workspace consumer
  // Create queue consumer's
  //
  const workspaceConsumer = queue.createConsumer<QueueWorkspaceMessage>(
    ctx,
    QueueTopic.Workspace,
    'ai-bot',
    async (ctx, message, control) => {
      try {
        if (message.value.type === QueueWorkspaceEvent.Up) {
          await aiControl.connect(message.workspace)
        }
      } catch (err: any) {
        ctx.error('failed to handle operation', { error: err.message })
      }
    }
  )

  const aiEventConsumer = queue.createConsumer<AIEventRequest>(
    ctx,
    QueueTopic.AIQueue,
    'ai-bot',
    async (ctx, message, control) => {
      try {
        await aiControl.processEvent(message.workspace, [message.value], control)
      } catch (err: any) {
        ctx.error('failed to handle ai event', { error: err.message })
      }
    }
  )

  const app = createServer(aiControl, ctx)
  const server = listen(app, config.Port)

  let billingIntervalId: any | undefined
  if (config.BillingUrl !== '') {
    billingIntervalId = setInterval(
      () => {
        try {
          void updateDeepgramBilling(ctx)
        } catch {}
      },
      config.DeepgramPollIntervalMinutes * 60 * 1000
    )
    try {
      void updateDeepgramBilling(ctx)
    } catch {}
  }

  const onClose = (): void => {
    void workspaceConsumer.close()
    void aiEventConsumer.close()
    if (billingIntervalId !== undefined) {
      clearInterval(billingIntervalId)
    }
    void aiControl.close()
    server.close(() => process.exit())
  }

  process.on('SIGINT', onClose)
  process.on('SIGTERM', onClose)
  process.on('uncaughtException', (e: Error) => {
    console.error(e)
  })
  process.on('unhandledRejection', (e: Error) => {
    console.error(e)
  })
}
