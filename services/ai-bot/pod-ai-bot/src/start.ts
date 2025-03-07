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
import serverToken, { generateToken } from '@hcengineering/server-token'
import { initStatisticsContext } from '@hcengineering/server-core'

import config from './config'
import { getAccountUuid } from './utils/account'
import { registerLoaders } from './loaders'
import { getDbStorage } from './storage'
import { AIControl } from './controller'
import { createServer, listen } from './server/server'
import type { SocialId } from '@hcengineering/core'
import { getClient as getAccountClient } from '@hcengineering/account-client'

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.ServerSecret)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)

  registerLoaders()

  const ctx = initStatisticsContext('ai-bot-service', {})
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

  const storage = await getDbStorage()
  const socialIds: SocialId[] = await getAccountClient(config.AccountsURL, generateToken(personUuid)).getSocialIds()

  const aiControl = new AIControl(personUuid, socialIds, storage, ctx)

  const app = createServer(aiControl, ctx)
  const server = listen(app, config.Port)

  const onClose = (): void => {
    void aiControl.close()
    storage.close()
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
