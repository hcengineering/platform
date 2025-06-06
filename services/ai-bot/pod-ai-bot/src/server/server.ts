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
import {
  TranslateRequest,
  ConnectMeetingRequest,
  DisconnectMeetingRequest,
  AIEventRequest,
  PostTranscriptRequest,
  SummarizeMessagesRequest
} from '@hcengineering/ai-bot'
import { extractToken } from '@hcengineering/server-client'
import { MeasureContext } from '@hcengineering/core'

import { ApiError } from './error'
import { AIControl } from '../controller'

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
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  void handleRequest(fn, req, res, next)
}

export function createServer (controller: AIControl, ctx: MeasureContext): Express {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.post(
    '/translate',
    wrapRequest(async (req, res) => {
      if (req.body == null || Array.isArray(req.body) || typeof req.body !== 'object') {
        throw new ApiError(400)
      }
      const response = await controller.translate(req.body as TranslateRequest)
      if (response === undefined) {
        throw new ApiError(500)
      }

      res.status(200)
      res.json(response)
    })
  )

  app.post(
    '/summarize',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || Array.isArray(req.body) || typeof req.body !== 'object') {
        throw new ApiError(400)
      }

      const response = await controller.summarizeMessages(token.workspace, req.body as SummarizeMessagesRequest)
      if (response === undefined) {
        throw new ApiError(500)
      }

      res.status(200)
      res.json(response)
    })
  )

  app.post(
    '/connect',
    wrapRequest(async (_, res, token) => {
      ctx.info('Request to connect to workspace', { workspace: token.workspace })
      await controller.connect(token.workspace)

      res.status(200)
      res.json({})
    })
  )

  app.post(
    '/events',
    wrapRequest(async (req, res, token) => {
      if (req.body == null) {
        throw new ApiError(400)
      }

      const events = Array.isArray(req.body) ? req.body : [req.body]

      await controller.processEvent(token.workspace, events as AIEventRequest[])
    })
  )

  app.post(
    '/love/transcript',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || Array.isArray(req.body) || typeof req.body !== 'object') {
        throw new ApiError(400)
      }

      if (token.account !== controller.personUuid) {
        throw new ApiError(401)
      }

      await controller.processLoveTranscript(req.body as PostTranscriptRequest)

      res.status(200)
      res.json({})
    })
  )

  app.post(
    '/love/connect',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || Array.isArray(req.body) || typeof req.body !== 'object') {
        throw new ApiError(400)
      }

      const request: ConnectMeetingRequest = req.body
      await controller.loveConnect(token.workspace, request)

      res.status(200)
      res.json({})
    })
  )

  app.post(
    '/love/disconnect',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || Array.isArray(req.body) || typeof req.body !== 'object') {
        throw new ApiError(400)
      }

      const request: DisconnectMeetingRequest = req.body
      await controller.loveDisconnect(token.workspace, request)

      res.status(200)
      res.json({})
    })
  )

  app.get(
    '/love/:roomName/identity',
    wrapRequest(async (req, res, token) => {
      if (token.account !== controller.personUuid) {
        throw new ApiError(401)
      }

      const roomName = req.params.roomName
      const resp = await controller.getLoveIdentity(roomName)

      if (resp === undefined) {
        throw new ApiError(404)
      }

      res.status(200)
      res.json(resp)
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.log(err)
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }

    res.status(500).send(err.message?.length > 0 ? { message: err.message } : err)
  })

  return app
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`AI service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
