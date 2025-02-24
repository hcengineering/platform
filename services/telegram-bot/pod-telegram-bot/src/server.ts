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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Token } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'
import { MeasureContext } from '@hcengineering/core'
import { Telegraf } from 'telegraf'
import telegram, { TelegramNotificationRequest } from '@hcengineering/telegram'
import { translate } from '@hcengineering/platform'
import { extractToken } from '@hcengineering/server-client'

import { ApiError } from './error'
import { PlatformWorker } from './worker'
import { Limiter } from './limiter'
import config from './config'
import { toTelegramHtml, toMediaGroups } from './utils'
import { TgContext } from './telegraf/types'

type AsyncRequestHandler = (req: Request, res: Response, token: Token, next: NextFunction) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractToken(req.headers)
  if (token === undefined) {
    throw new ApiError(401)
  }
  try {
    await fn(req, res, token, next)
  } catch (err: unknown) {
    console.error(err)
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void handleRequest(fn, req, res, next)
}

export function createServer (
  bot: Telegraf<TgContext>,
  worker: PlatformWorker,
  ctx: MeasureContext,
  limiter: Limiter
): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.post(
    '/test',
    wrapRequest(async (_, res, token) => {
      // TODO: FIXME
      throw new Error('Not implemented')
      // const record = await worker.getUserRecordByEmail(token.email)
      // if (record === undefined) {
      //   throw new ApiError(404)
      // }

      // await limiter.add(record.telegramId, async () => {
      //   ctx.info('Sending test message', { email: token.email, username: record.telegramUsername })
      //   const testMessage = await translate(telegram.string.TestMessage, { app: config.App })
      //   await bot.telegram.sendMessage(record.telegramId, testMessage)
      // })

      // res.status(200)
      // res.json({})
    })
  )

  app.post(
    '/updateWorkspace',
    wrapRequest(async (req, res, token) => {
      // TODO: FIXME
      throw new Error('Not implemented')
      // if (req.body == null || typeof req.body !== 'object' || req.body.enabled == null) {
      //   throw new ApiError(400)
      // }

      // const enabled: boolean = req.body.enabled
      // const record = await worker.getUserRecordByEmail(token.email)

      // if (record === undefined) {
      //   return
      // }

      // if (enabled && !record.workspaces.includes(token.workspace.name)) {
      //   await worker.addWorkspace(token.email, token.workspace.name)
      // }

      // if (!enabled && record.workspaces.includes(token.workspace.name)) {
      //   await worker.removeWorkspace(token.email, token.workspace.name)
      // }

      // res.status(200)
      // res.json({})
    })
  )

  app.post(
    '/auth',
    wrapRequest(async (req, res, token) => {
      // TODO: FIXME
      throw new Error('Not implemented')
      // if (req.body == null || typeof req.body !== 'object') {
      //   throw new ApiError(400)
      // }

      // const { code } = req.body

      // if (code == null || code === '' || typeof code !== 'string') {
      //   throw new ApiError(400)
      // }

      // const record = await worker.getUserRecordByEmail(token.email)

      // if (record !== undefined) {
      //   throw new ApiError(409, 'User already authorized')
      // }

      // const newRecord = await worker.authorizeUser(code, token.email, token.workspace.name)

      // if (newRecord === undefined) {
      //   throw new ApiError(500)
      // }

      // void limiter.add(newRecord.telegramId, async () => {
      //   ctx.info('Connected account', { email: token.email, username: newRecord.telegramUsername })
      //   const message = await translate(telegram.string.AccountConnectedHtml, { app: config.App, email: token.email })
      //   await bot.telegram.sendMessage(newRecord.telegramId, message, { parse_mode: 'HTML' })
      // })

      // res.status(200)
      // res.json({})
    })
  )

  app.get(
    '/info',
    wrapRequest(async (_, res) => {
      const me = await bot.telegram.getMe()
      const profilePhotos = await bot.telegram.getUserProfilePhotos(me.id)
      const photoId = profilePhotos.photos[0]?.[0]?.file_id

      let photoUrl = ''

      if (photoId !== undefined) {
        photoUrl = (await bot.telegram.getFileLink(photoId)).toString()
      }
      res.status(200)
      res.json({ username: me.username, name: me.first_name, photoUrl })
    })
  )

  app.post(
    '/notify',
    wrapRequest(async (req, res, token) => {
      // TODO: FIXME
      throw new Error('Not implemented')
      // if (req.body == null || !Array.isArray(req.body)) {
      //   ctx.error('Invalid request body', { body: req.body, email: token.email })
      //   throw new ApiError(400)
      // }

      // const notificationRequests = req.body as TelegramNotificationRequest[]
      // const userRecord = await worker.getUserRecordByEmail(token.email)

      // if (userRecord === undefined) {
      //   ctx.error('User not found', { email: token.email })
      //   throw new ApiError(404)
      // }

      // ctx.info('Received notification', {
      //   email: token.email,
      //   username: userRecord.telegramUsername,
      //   ids: notificationRequests.map((it) => it.notificationId)
      // })

      // for (const request of notificationRequests) {
      //   void limiter.add(userRecord.telegramId, async () => {
      //     const { full: fullMessage, short: shortMessage } = toTelegramHtml(request)
      //     const files = await worker.getFiles(request)
      //     const messageIds: number[] = []

      //     if (files.length === 0) {
      //       const message = await bot.telegram.sendMessage(userRecord.telegramId, fullMessage, {
      //         parse_mode: 'HTML'
      //       })

      //       messageIds.push(message.message_id)
      //     } else {
      //       const groups = toMediaGroups(files, fullMessage, shortMessage)
      //       for (const group of groups) {
      //         const mediaGroup = await bot.telegram.sendMediaGroup(userRecord.telegramId, group)
      //         messageIds.push(...mediaGroup.map((it) => it.message_id))
      //       }
      //     }

      //     for (const messageId of messageIds) {
      //       await worker.addNotificationRecord({
      //         messageId: request.messageId,
      //         notificationId: request.notificationId,
      //         email: userRecord.email,
      //         workspace: request.workspace,
      //         telegramId: messageId
      //       })
      //     }
      //   })
      // }

      // res.status(200)
      // res.json({})
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }

    res.status(500).send(err.message?.length > 0 ? { message: err.message } : err)
  })

  return app
}

export function listen (e: Express, ctx: MeasureContext, port: number, host?: string): Server {
  const cb = (): void => {
    ctx.info(`Telegram bot service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
