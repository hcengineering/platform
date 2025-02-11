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
import { AnalyticEvent } from '@hcengineering/analytics-collector'
import { extractToken } from '@hcengineering/server-client'

import { ApiError } from './error'
import { Collector } from './collector'

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

function isContentValid (body: any[]): boolean {
  return !body.some((it) => {
    if (it == null) {
      return true
    }

    if (!('event' in it)) {
      return true
    }

    if (!('params' in it)) {
      return true
    }

    return !('timestamp' in it)
  })
}

export function createServer (collector: Collector): Express {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.post(
    '/collect',
    wrapRequest(async (req, res, token) => {
      if (req.body == null || !Array.isArray(req.body)) {
        throw new ApiError(400)
      }

      if (!isContentValid(req.body)) {
        throw new ApiError(400)
      }

      const events: AnalyticEvent[] = req.body

      collector.collect(events, token)

      res.status(200)
      res.json({})
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
    console.log(`Analytics collector service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
