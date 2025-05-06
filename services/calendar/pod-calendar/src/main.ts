//
// Copyright © 2023 Hardcore Engineering Inc.
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
import { initStatisticsContext } from '@hcengineering/server-core'
import serverToken, { decodeToken } from '@hcengineering/server-token'
import { type IncomingHttpHeaders } from 'http'
import { join } from 'path'
import { AuthController } from './auth'
import { decode64 } from './base64'
import { CalendarController } from './calendarController'
import config from './config'
import { createServer, listen } from './server'
import { CALENDAR_INTEGRATION, GoogleEmail, type Endpoint, type State } from './types'
import { getServiceToken } from './utils'
import { WatchController } from './watch'
import { PushHandler } from './pushHandler'

const extractToken = (header: IncomingHttpHeaders): any => {
  try {
    return header.authorization?.slice(7) ?? ''
  } catch {
    return undefined
  }
}

export const main = async (): Promise<void> => {
  const ctx = initStatisticsContext(CALENDAR_INTEGRATION, {
    factory: () =>
      new MeasureMetricsContext(
        'calendar',
        {},
        {},
        newMetrics(),
        new SplitLogger(CALENDAR_INTEGRATION, {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })

  const accountClient = getAccountClient(getServiceToken())

  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const pushHandler = new PushHandler(ctx, accountClient)
  const calendarController = CalendarController.getCalendarController(ctx, accountClient)
  await calendarController.startAll()
  const watchController = WatchController.get(accountClient)
  watchController.startCheck()
  const endpoints: Endpoint[] = [
    {
      endpoint: '/signin',
      type: 'get',
      handler: async (req, res) => {
        try {
          const token = extractToken(req.headers)

          if (token === undefined) {
            res.status(401).send()
            return
          }
          const redirectURL = req.query.redirectURL as string

          const { account, workspace } = decodeToken(token)
          const userId = await AuthController.getUserId(account, token)
          const url = AuthController.getAuthUrl(redirectURL, workspace, userId, token)
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
        const code = req.query.code as string
        try {
          const state = JSON.parse(decode64(req.query.state as string)) as unknown as State
          try {
            await AuthController.createAndSync(ctx, accountClient, state, code)
            res.redirect(state.redirectURL)
          } catch (err) {
            ctx.error('signin code error', { message: (err as any).message })
          }
        } catch (err) {
          ctx.error('signin code state parse error', { message: (err as any).message })
        }
      }
    },
    {
      endpoint: '/signout',
      type: 'get',
      handler: async (req, res) => {
        try {
          const token = extractToken(req.headers)

          if (token === undefined) {
            res.status(401).send()
            return
          }

          const value = req.query.value as GoogleEmail
          const { account, workspace } = decodeToken(token)
          const userId = await AuthController.getUserId(account, token)
          await AuthController.signout(ctx, accountClient, userId, workspace, value)
        } catch (err) {
          ctx.error('signout', { message: (err as any).message })
        }
        res.send()
      }
    },
    {
      endpoint: '/push',
      type: 'post',
      handler: async (req, res) => {
        const state = req.headers['x-goog-resource-state']
        const token = req.headers['x-goog-channel-token']
        if (state === 'exists' && typeof token === 'string') {
          const params = token.split('&')
          const data: Record<string, string> = {}
          for (const param of params) {
            const [key, val] = param.split('=')
            if (key !== undefined && val !== undefined) {
              data[key] = val
            }
          }
          if (data.mode === undefined || data.user === undefined) {
            res.status(400).send({ err: "'data' is missing" })
            return
          }
          await pushHandler.push(data.user as GoogleEmail, data.mode as 'events' | 'calendar', data.calendarId)
        }

        res.send()
      }
    },
    {
      endpoint: '/event',
      type: 'post',
      handler: async (req, res) => {
        const { event, workspace, type } = req.body

        if (event === undefined || workspace === undefined || type === undefined) {
          res.status(400).send({ err: "'event' or 'workspace' or 'type' is missing" })
          return
        }
        void calendarController.pushEvent(workspace, event, type)
        res.send()
      }
    }
  ]

  const server = listen(createServer(endpoints), config.Port)

  const shutdown = (): void => {
    server.close(() => {
      watchController.stop()
      process.exit()
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
