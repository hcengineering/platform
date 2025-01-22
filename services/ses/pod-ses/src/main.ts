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

import type { Ref } from '@hcengineering/core'
import { PushSubscription, type PushData } from '@hcengineering/notification'
import type { Request, Response } from 'express'
import webpush, { WebPushError } from 'web-push'
import config from './config'
import { createServer, listen } from './server'
import { SES } from './ses'
import { Endpoint } from './types'

const errorMessages = ['expired', 'Unregistered', 'No such subscription']
async function sendPushToSubscription (
  subscriptions: PushSubscription[],
  data: PushData
): Promise<Ref<PushSubscription>[]> {
  const result: Ref<PushSubscription>[] = []
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(subscription, JSON.stringify(data))
    } catch (err: any) {
      if (err instanceof WebPushError) {
        if (errorMessages.some((p) => JSON.stringify((err as WebPushError).body).includes(p))) {
          result.push(subscription._id)
        }
      }
    }
  }
  return result
}

export const main = async (): Promise<void> => {
  const ses = new SES()
  console.log('SES service has been started')
  let webpushInitDone = false

  if (config.PushPublicKey !== undefined && config.PushPrivateKey !== undefined) {
    try {
      const subj = config.PushSubject ?? 'mailto:hey@huly.io'
      console.log('Setting VAPID details', subj, config.PushPublicKey.length, config.PushPrivateKey.length)
      webpush.setVapidDetails(config.PushSubject ?? 'mailto:hey@huly.io', config.PushPublicKey, config.PushPrivateKey)
      webpushInitDone = true
    } catch (err: any) {
      console.error(err)
    }
  }

  const checkAuth = (req: Request<any>, res: Response<any>): boolean => {
    if (config.AuthToken !== undefined) {
      // We need to verify authorization
      const authorization = req.headers.authorization ?? ''
      const token = authorization.replace('Bearer ', '')
      if (token !== config.AuthToken) {
        res.status(401).send({ err: 'Invalid auth token' })
        return false
      }
    }
    return true
  }

  const endpoints: Endpoint[] = [
    {
      endpoint: '/send',
      type: 'post',
      handler: async (req, res) => {
        if (!checkAuth(req, res)) {
          return
        }
        const text = req.body?.text
        if (text === undefined) {
          res.status(400).send({ err: "'text' is missing" })
          return
        }
        const subject = req.body?.subject
        if (subject === undefined) {
          res.status(400).send({ err: "'subject' is missing" })
          return
        }
        const html = req.body?.html
        const to = req.body?.to
        if (to === undefined) {
          res.status(400).send({ err: "'to' is missing" })
          return
        }
        const receivers = {
          to: Array.isArray(to) ? to : [to]
        }
        try {
          await ses.sendMessage({ text, subject, html }, receivers)
        } catch (err) {
          console.log(err)
        }

        res.send()
      }
    },
    {
      endpoint: '/web-push',
      type: 'post',
      handler: async (req, res) => {
        if (!checkAuth(req, res)) {
          return
        }
        const data: PushData | undefined = req.body?.data
        if (data === undefined) {
          res.status(400).send({ err: "'data' is missing" })
          return
        }
        const subscriptions: PushSubscription[] | undefined = req.body?.subscriptions
        if (subscriptions === undefined) {
          res.status(400).send({ err: "'subscriptions' is missing" })
          return
        }
        if (!webpushInitDone) {
          res.json({ result: [] }).end()
          return
        }

        const result = await sendPushToSubscription(subscriptions, data)
        res.json({ result }).end()
      }
    }
  ]

  const server = listen(createServer(endpoints), config.Port)

  const shutdown = (): void => {
    server.close(() => {
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
