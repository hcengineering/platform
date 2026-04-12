//
// Copyright © 2026 Hardcore Engineering Inc.
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

import type { MeasureContext } from '@hcengineering/core'
import { PushSubscription, type PushData } from '@hcengineering/notification'
import type { Request, Response } from 'express'
import webpush from 'web-push'
import config from './config'
import { sendPushToSubscription } from './push'
import { createServer, listen } from './server'
import { Endpoint } from './types'

export const main = async (ctx: MeasureContext): Promise<void> => {
  ctx.info('Notification service starting')
  let webpushInitDone = false

  if (config.PushPublicKey !== undefined && config.PushPrivateKey !== undefined) {
    try {
      const subj = config.PushSubject ?? 'mailto:hey@huly.io'
      ctx.info('Setting VAPID details', {
        subject: subj,
        publicKeyLen: config.PushPublicKey.length,
        privateKeyLen: config.PushPrivateKey.length
      })
      webpush.setVapidDetails(subj, config.PushPublicKey, config.PushPrivateKey)
      webpushInitDone = true
    } catch (err: unknown) {
      ctx.error('Failed to set VAPID details', { error: err })
    }
  } else {
    ctx.warn('VAPID keys not configured; /web-push will return empty results until keys are set')
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

        const result = await sendPushToSubscription(ctx, subscriptions, data)
        res.json({ result }).end()
      }
    }
  ]

  const server = listen(createServer(endpoints), config.Port, undefined, () => {
    ctx.info('Notification service listening', { port: config.Port })
  })

  const shutdown = (): void => {
    ctx.info('Closed')
    server.close(() => {
      process.exit()
    })
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}
