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

import { extractToken } from '@hcengineering/server-client'
import { type Response, type Request, type NextFunction, RequestHandler } from 'express'
import { ApiError } from './error'

export interface KeepAliveOptions {
  timeout: number
  max: number
}

export const keepAlive = (options: KeepAliveOptions): RequestHandler => {
  const { timeout, max } = options
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Keep-Alive', `timeout=${timeout}, max=${max}`)
    next()
  }
}

export const withAuthorization = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req.headers)
    if (token == null) {
      throw new ApiError(401, 'Unauthorized')
    }

    next()
  } catch (err: any) {
    next(err)
  }
}

export const withWorkspace = (req: Request, res: Response, next: NextFunction): void => {
  if (req.params.workspace === undefined || req.params.workspace === '') {
    next(new ApiError(400, 'Missing workspace'))
    return
  }

  next()
}

export const withBlob = (req: Request, res: Response, next: NextFunction): void => {
  if (req.params.workspace === undefined || req.params.workspace === '') {
    next(new ApiError(400, 'Missing workspace'))
    return
  }
  if (req.params.name === undefined || req.params.name === '') {
    next(new ApiError(400, 'Missing blob name'))
    return
  }

  next()
}
