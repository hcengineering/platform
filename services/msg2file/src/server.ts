//
// Copyright © 2025 Hardcore Engineering Inc.
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
import { extractToken } from '@hcengineering/server-client'
import { MeasureContext } from '@hcengineering/core'
import { CardID } from '@hcengineering/communication-types'

import config from './config'
import { register } from './worker'

export function startServer (ctx: MeasureContext): Server {
  const app = createServer(ctx)
  const port = config.Port

  return app.listen(port, (): void => {
    console.log(`Msg2file service has been started at :${port}`)
  })
}

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

function createServer (ctx: MeasureContext): Express {
  const app = express()
  app.use(cors())
  app.use(express.json())

  app.post(
    '/register/:card',
    wrapRequest(async (req, res, token) => {
      const { card } = req.params
      const { workspace } = token

      if (card == null || card === '') {
        throw new ApiError(400)
      }

      ctx.info('Register card', { workspace, card })
      await register(workspace, card as CardID)
      res.status(200)
      res.json({})
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.error(err)
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }

    res.status(500).send(err.message?.length > 0 ? { message: err.message } : err)
  })

  return app
}

class ApiError extends Error {
  readonly code: number

  constructor (code: number, message?: string) {
    super(message ?? generateErrorMessage(code))
    this.code = code
  }
}

const generateErrorMessage = (code: number): string => {
  if (code === 401) {
    return 'Unauthorized'
  }

  if (code === 404) {
    return 'Not Found'
  }

  if (code === 400) {
    return 'Bad Request'
  }

  return 'Error'
}
