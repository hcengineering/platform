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

import type { NextFunction, Request, Response } from 'express'
import { extractToken } from '@hcengineering/server-client'
import { systemAccountUuid } from '@hcengineering/core'
import { ApiError } from './error'
import { Token } from '@hcengineering/server-token'

interface RequestWithAuth extends Request {
  token?: Token
}

export const withAdminAuthorization = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  try {
    const token = extractToken(req.headers)
    if (token == null || !(token.account === systemAccountUuid || token.extra?.admin === 'true')) {
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
    if (token == null || token.extra?.guest === 'true') {
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
      (req.token.workspace as string) === req.params.workspace ||
      req.token.account === systemAccountUuid ||
      req.token.extra?.admin === 'true'
    if (!hasWorkspaceAccess) {
      throw new ApiError(401, 'Unauthorized')
    }
  }

  next()
}
