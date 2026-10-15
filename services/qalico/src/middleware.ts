//
// Copyright © 2026 TraceX.
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

import { Analytics } from '@hcengineering/analytics'
import { MeasureContext } from '@hcengineering/core'
import { Token, extractToken, readToken } from '@hcengineering/server-token'
import { type Response, type Request, type NextFunction, type RequestHandler, type ErrorRequestHandler } from 'express'

export interface KeepAliveOptions {
  timeout: number
  max: number
}

export interface RequestWithAuth extends Request {
  token?: Token
  rawToken?: string
}

export const keepAlive = (options: KeepAliveOptions): RequestHandler => {
  const { timeout, max } = options
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Keep-Alive', `timeout=${timeout}, max=${max}`)
    next()
  }
}

export const withAuthorization = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  try {
    const rawToken = readToken(req.headers)
    const token = extractToken(req.headers)
    if (token == null || rawToken == null) {
      res.status(401).json({ message: 'Unauthorized' })
      return
    }
    req.token = token
    req.rawToken = rawToken

    next()
  } catch (err: any) {
    next(err)
  }
}

export interface ErrorHandlerOptions {
  ctx: MeasureContext
}

export const errorHandler = (options: ErrorHandlerOptions): ErrorRequestHandler => {
  const { ctx } = options

  return (err: any, req: Request, res: Response, _next: NextFunction): void => {
    ctx.error(err.message, { code: err.code, message: err.message })

    Analytics.handleError(err)

    const statusCode = err.statusCode ?? err.code ?? 500
    res.status(statusCode).json({ message: err.message ?? 'Internal Server Error' })
  }
}
