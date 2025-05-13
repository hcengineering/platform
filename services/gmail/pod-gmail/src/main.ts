/* eslint-disable @typescript-eslint/no-unused-vars */
//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { SplitLogger } from '@hcengineering/analytics-service'
import { MeasureMetricsContext, newMetrics } from '@hcengineering/core'
import { setMetadata } from '@hcengineering/platform'
import serverClient, { getAccountClient } from '@hcengineering/server-client'
import { isWorkspaceLoginInfo } from '@hcengineering/account-client'
import { initStatisticsContext, type StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import serverToken, { decodeToken } from '@hcengineering/server-token'
import { type IncomingHttpHeaders } from 'http'
import { join } from 'path'

import { decode64 } from './base64'
import config from './config'
import { GmailController } from './gmailController'
import { createServer, listen } from './server'
import { IntegrationVersion, type Endpoint, type State } from './types'
import { initQueue, closeQueue } from './queue'

const extractToken = (header: IncomingHttpHeaders): any => {
  try {
    return header.authorization?.slice(7) ?? ''
  } catch {
    return undefined
  }
}

export const main = async (): Promise<void> => {
  const ctx = initStatisticsContext('gmail', {
    factory: () =>
      new MeasureMetricsContext(
        'gmail',
        {},
        {},
        newMetrics(),
        new SplitLogger('gmail', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig)

  if (config.Version === IntegrationVersion.V2) {
    initQueue(ctx, config.QueueRegion)
  }

  const gmailController = GmailController.create(ctx, storageAdapter)
  await gmailController.startAll()
  const endpoints: Endpoint[] = [
    {
      endpoint: '/signin',
      type: 'get',
      handler: async (req, res) => {
        try {
          ctx.info('Signin request received')
          const token = extractToken(req.headers)

          if (token === undefined) {
            res.status(401).send()
            return
          }
          const redirectURL = req.query.redirectURL as string

          const accountClient = getAccountClient(token)
          const wsLoginInfo = await accountClient.getLoginInfoByToken()
          if (!isWorkspaceLoginInfo(wsLoginInfo)) {
            res.status(400).send({ err: "Couldn't find workspace with the provided token" })
            return
          }

          const authProvider = gmailController.getAuthProvider()
          const url = authProvider.getAuthUrl(redirectURL, {
            workspace: wsLoginInfo.workspace,
            userId: wsLoginInfo.account
          })
          res.send(url)
        } catch (err) {
          ctx.error('signin error', { message: (err as any).message })
          res.status(500).send()
        }
      }
    },
    {
      endpoint: '/signin/code',
      type: 'get',
      handler: async (req, res) => {
        try {
          ctx.info('Signin code request received')
          const code = req.query.code as string
          const state = JSON.parse(decode64(req.query.state as string)) as unknown as State
          await gmailController.createClient(state, code)
          res.redirect(state.redirectURL)
        } catch (err) {
          ctx.error('Failed to process signin code', { message: (err as any).message })
          res.status(500).send()
        }
      }
    },
    {
      endpoint: '/signout',
      type: 'get',
      handler: async (req, res) => {
        ctx.info('Signout request received')
        try {
          const token = extractToken(req.headers)

          if (token === undefined) {
            res.status(401).send()
            return
          }

          const { account, workspace } = decodeToken(token)

          await gmailController.signout(workspace, account)
        } catch (err) {
          ctx.error('signout error', { message: JSON.stringify(err) })
        }

        res.send()
      }
    },
    {
      endpoint: '/push',
      type: 'post',
      handler: async (req, res) => {
        try {
          const data = req.body?.message?.data
          if (data === undefined) {
            res.status(400).send({ err: "'data' is missing" })
            return
          }
          gmailController.push(data)

          res.send()
        } catch (err) {
          ctx.error('Push request failed', { message: JSON.stringify(err) })
          res.status(500).send()
        }
      }
    }
  ]

  const server = listen(createServer(endpoints), config.Port)

  const asyncClose = async (): Promise<void> => {
    await gmailController.close()
    await storageAdapter.close()
    await closeQueue()
  }

  const shutdown = (): void => {
    server.close(() => {
      void asyncClose().then(() => process.exit())
    })
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
