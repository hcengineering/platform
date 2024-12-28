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

import { setMetadata } from '@hcengineering/platform'
import serverAiBot from '@hcengineering/server-ai-bot'
import serverClient, { createAccount } from '@hcengineering/server-client'
import serverToken from '@hcengineering/server-token'
import { initStatisticsContext } from '@hcengineering/server-core'

import { AIControl } from './controller'
import config from './config'
import { closeDB, DbStorage, getDB } from './storage'
import { registerLoaders } from './loaders'
import { createServer, listen } from './server/server'

export const start = async (): Promise<void> => {
  setMetadata(serverToken.metadata.Secret, config.ServerSecret)
  setMetadata(serverAiBot.metadata.SupportWorkspaceId, config.SupportWorkspace)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)

  registerLoaders()

  const ctx = initStatisticsContext('ai-bot-service', {})
  ctx.info('AI Bot Service started', { firstName: config.FirstName, lastName: config.LastName })

  const db = await getDB()
  const storage = new DbStorage(db)
  for (let i = 0; i < 5; i++) {
    ctx.info('Creating bot account', { attempt: i })
    try {
      // TODO: FIXME
      throw new Error('Not implemented')
      // await createAccount(aiBotAccountEmail, config.Password, config.FirstName, config.LastName)
      // break
    } catch (e) {
      ctx.error('Error during account creation', { error: e })
    }
    await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  const aiControl = new AIControl(storage, ctx)

  const app = createServer(aiControl, ctx)
  const server = listen(app, config.Port)

  const onClose = (): void => {
    void aiControl.close()
    void closeDB()
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
