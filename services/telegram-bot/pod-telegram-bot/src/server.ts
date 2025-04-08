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
import { Token } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'
import { MeasureContext, WorkspaceUuid } from '@hcengineering/core'
import { Telegraf } from 'telegraf'
import telegram from '@hcengineering/telegram'
import { translate } from '@hcengineering/platform'
import { extractToken } from '@hcengineering/server-client'
import { Readable } from 'stream'
import type { ReadableStream } from 'stream/web'

import { ApiError } from './error'
import { PlatformWorker } from './worker'
import config from './config'
import { TgContext } from './telegraf/types'
import { addWorkspace, findIntegrationByAccount, getAccountPerson } from './account'

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

export function createServer (bot: Telegraf<TgContext>, worker: PlatformWorker, ctx: MeasureContext): Express {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.post(
    '/test',
    wrapRequest(async (_, res, token) => {
      const record = await findIntegrationByAccount(token.account)
      if (record === undefined) {
        throw new ApiError(404)
      }

      const workspaces: WorkspaceUuid[] = record.data?.workspaces ?? []
      if (!workspaces.includes(token.workspace)) {
        await addWorkspace(record, token.workspace)
      }

      await worker.limiter.add(record.telegramId, async () => {
        ctx.info('Sending test message', { account: token.account, username: record.username })
        const testMessage = await translate(telegram.string.TestMessage, { app: config.App })
        await bot.telegram.sendMessage(record.telegramId, testMessage)
      })

      res.status(200)
      res.json({})
    })
  )

  app.post(
    '/auth',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || typeof req.body !== 'object') {
        throw new ApiError(400)
      }

      const { code } = req.body

      if (code == null || code === '' || typeof code !== 'string') {
        throw new ApiError(400)
      }

      const record = await findIntegrationByAccount(token.account)

      if (record !== undefined) {
        throw new ApiError(409, 'User already authorized')
      }

      const person = await getAccountPerson(token.account)
      if (person === undefined) {
        throw new ApiError(404, 'Person not found')
      }

      const newRecord = await worker.authorizeUser(code, token.account, token.workspace)
      if (newRecord === undefined) {
        throw new ApiError(500)
      }

      void worker.limiter.add(newRecord.telegramId, async () => {
        ctx.info('Connected account', { account: token.account, username: newRecord.username })
        const message = await translate(telegram.string.AccountConnectedHtml, {
          app: config.App,
          name: `${person.firstName} ${person.lastName}`
        })
        await bot.telegram.sendMessage(newRecord.telegramId, message, { parse_mode: 'HTML' })
      })

      res.status(200)
      res.json({})
    })
  )

  app.get(
    '/info',
    wrapRequest(async (req, res) => {
      const me = bot.botInfo ?? (await bot.telegram.getMe())
      const profilePhotos = await bot.telegram.getUserProfilePhotos(me.id)
      const photoId = profilePhotos.photos[0]?.[0]?.file_id ?? ''

      res.status(200)
      res.json({ username: me.username, name: me.first_name, photoId })
    })
  )

  app.get(
    '/photo/:fileId',
    wrapRequest(async (req, res) => {
      const { fileId } = req.params
      const fileLink = await bot.telegram.getFileLink(fileId)

      const response = await fetch(fileLink.toString())
      if (!response.ok) {
        res.status(response.status).send(response.statusText)
        return
      }

      if (response.body != null) {
        res.setHeader('Content-Type', response.headers.get('Content-Type') ?? 'application/octet-stream')
        res.setHeader('Content-Length', response.headers.get('Content-Length') ?? '0')

        const stream = Readable.fromWeb(response.body as ReadableStream<any>)
        stream.pipe(res)
      } else {
        res.status(500).send('Failed to fetch photo')
      }
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
