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

import { type IncomingHttpHeaders } from 'http'
import { decode64 } from './base64'
import { CalendarController } from './calendarController'
import config from './config'
import { createServer, listen } from './server'
import { closeDB, getDB } from './storage'
import { type Endpoint, type State } from './types'
import { setMetadata } from '@hcengineering/platform'
import serverClient from '@hcengineering/server-client'
import serverToken, { decodeToken } from '@hcengineering/server-token'
import { GoogleClient } from './googleClient'
import { WatchController } from './watch'

const extractToken = (header: IncomingHttpHeaders): any => {
  try {
    return header.authorization?.slice(7) ?? ''
  } catch {
    return undefined
  }
}

export const main = async (): Promise<void> => {
  setMetadata(serverClient.metadata.Endpoint, config.AccountsURL)
  setMetadata(serverClient.metadata.UserAgent, config.ServiceID)
  setMetadata(serverToken.metadata.Secret, config.Secret)

  const db = await getDB()
  const calendarController = CalendarController.getCalendarController(db)
  await calendarController.startAll()
  const watchController = WatchController.get(db)
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

          const { email, workspace } = decodeToken(token)
          const userId = await calendarController.getUserId(email, workspace.name)
          const url = GoogleClient.getAutUrl(redirectURL, workspace.name, userId, token)
          res.send(url)
        } catch (err) {
          console.error('signin error', err)
          res.status(500).send()
        }
      }
    },
    {
      endpoint: '/signin/code',
      type: 'get',
      handler: async (req, res) => {
        const code = req.query.code as string
        const state = JSON.parse(decode64(req.query.state as string)) as unknown as State
        try {
          await calendarController.newClient(state, code)
          res.redirect(state.redirectURL)
        } catch (err) {
          console.error(err)
          res.redirect(state.redirectURL)
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

          const value = req.query.value as string

          const { workspace } = decodeToken(token)
          await calendarController.signout(workspace.name, value)
        } catch (err) {
          console.error('signout error', err)
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
          void calendarController.push(data.user, data.mode as 'events' | 'calendar', data.calendarId)
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
      void calendarController
        .close()
        .then(async () => {
          await closeDB()
        })
        .then(() => process.exit())
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
