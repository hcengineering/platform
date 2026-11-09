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

import { Analytics } from '@hcengineering/analytics'
import { MeasureContext, systemAccountUuid } from '@hcengineering/core'
import { extractToken } from '@hcengineering/server-client'
import { Token } from '@hcengineering/server-token'
import { type Response, type Request, type NextFunction, type RequestHandler, type ErrorRequestHandler } from 'express'
import { HttpError } from './error'

export interface KeepAliveOptions {
  timeout: number
  max: number
}

export interface RequestWithAuth extends Request {
  token?: Token
}

export const keepAlive = (options: KeepAliveOptions): RequestHandler => {
  const { timeout, max } = options
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Keep-Alive', `timeout=${timeout}, max=${max}`)
    next()
  }
}

export const withAdminAuthorization = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req.headers)
    if (token == null || !(token.account === systemAccountUuid || token.extra?.admin === 'true')) {
      throw new HttpError(401, 'Unauthorized')
    }
    req.token = token

    next()
  } catch (err: any) {
    next(err)
  }
}

export const withAuthorization = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req.headers)
    if (token == null || token.extra?.guest === 'true' || token.extra?.readonly === 'true') {
      throw new HttpError(401, 'Unauthorized')
    }
    req.token = token

    next()
  } catch (err: any) {
    next(err)
  }
}

/**
 * Validates blob route params and ensures the caller's token grants access to
 * the workspace taken from the URL. Must run after `withAuthorization`, which
 * guarantees a token is present.
 */
export const withBlob = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  try {
    const workspace = req.params.workspace
    const name = req.params.name

    if (workspace === undefined || workspace === '') {
      throw new HttpError(400, 'Missing workspace')
    }
    if (name === undefined || name === '') {
      throw new HttpError(400, 'Missing blob name')
    }

    const token = req.token
    if (token == null) {
      throw new HttpError(401, 'Unauthorized')
    }

    const hasWorkspaceAccess =
      (token.workspace as string) === workspace || token.account === systemAccountUuid || token.extra?.admin === 'true'
    if (!hasWorkspaceAccess) {
      throw new HttpError(401, 'Unauthorized')
    }

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

    if (err instanceof HttpError) {
      res.status(err.code).json({ message: err.message })
      return
    }

    Analytics.handleError(err)

    res.status(500).json({ message: err.message ?? 'Internal Server Error' })
  }
}
