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
import { Token } from '@hcengineering/server-token'
import { systemAccountEmail } from '@hcengineering/core'

export interface KeepAliveOptions {
  timeout: number
  max: number
}

interface RequestWithAuth extends Request {
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
    if (token == null || !(isSystem(token) || isAdmin(token))) {
      throw new ApiError(401, 'Unauthorized')
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
    if (token == null || isGuest(token)) {
      throw new ApiError(401, 'Unauthorized')
    }
    req.token = token

    next()
  } catch (err: any) {
    next(err)
  }
}

export const withWorkspace = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  if (req.params.workspace === undefined || req.params.workspace === '') {
    next(new ApiError(400, 'Missing workspace'))
    return
  }
  // If authorization is not enforced allow any workspace
  if (req.token != null) {
    const hasWorkspaceAccess =
      isWorkspaceToken(req.token, req.params.workspace) || isSystem(req.token) || isAdmin(req.token)
    if (!hasWorkspaceAccess) {
      throw new ApiError(401, 'Unauthorized')
    }
  }

  next()
}

export const withBlob = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  if (req.params.workspace === undefined || req.params.workspace === '') {
    next(new ApiError(400, 'Missing workspace'))
    return
  }
  if (req.params.name === undefined || req.params.name === '') {
    next(new ApiError(400, 'Missing blob name'))
    return
  }
  // If authorization is not enforced allow any workspace
  if (req.token != null) {
    const hasWorkspaceAccess =
      isWorkspaceToken(req.token, req.params.workspace) || isSystem(req.token) || isAdmin(req.token)
    if (!hasWorkspaceAccess) {
      throw new ApiError(401, 'Unauthorized')
    }
  }

  next()
}

function isWorkspaceToken (token: Token, workspace: string): boolean {
  return token.workspace.name === workspace
}

function isSystem (token: Token): boolean {
  return token.email === systemAccountEmail
}

function isAdmin (token: Token): boolean {
  return token.extra?.admin === 'true'
}

function isGuest (token: Token): boolean {
  return token.extra?.guest === 'true'
}
