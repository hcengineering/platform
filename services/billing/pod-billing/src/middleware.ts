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
import { extractToken, getAccountClient } from '@hcengineering/server-client'
import { AccountRole, systemAccountUuid } from '@hcengineering/core'
import { Token } from '@hcengineering/server-token'

interface RequestWithAuth extends Request {
  token?: Token
}

export const withToken = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  const token = extractToken(req.headers)
  if (token === undefined || token == null) {
    res.status(401).json({ message: 'Token error' }).end()
    return
  }
  req.token = token
  next()
}

export const withAdmin = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  if (req.token === undefined || req.token == null) {
    res.status(401).json({ message: 'Token error' }).end()
    return
  }
  if (req.token.account !== systemAccountUuid && req.token.extra?.admin !== 'true') {
    res.status(401).json({ message: 'Admins only' }).end()
    return
  }
  next()
}

export const withOwner = (req: RequestWithAuth, res: Response, next: NextFunction): void => {
  void withOwnerAsync(req, res, next)
}

const withOwnerAsync = async (req: RequestWithAuth, res: Response, next: NextFunction): Promise<void> => {
  if (req.token === undefined || req.token == null) {
    res.status(401).json({ message: 'Token error' }).end()
    return
  }
  if ((req.token.workspace as string) !== req.params.workspace) {
    res.status(401).json({ message: 'Workspace mismatch' }).end()
    return
  }
  if (req.token.account !== systemAccountUuid && req.token.extra?.admin !== 'true') {
    const accountClient = getAccountClient(req.headers.authorization?.split(' ')[1])
    const loginInfo = await accountClient.getLoginInfoByToken()
    if (loginInfo == null) {
      res.status(403).json({ message: 'Missing auth info' }).end()
      return
    }
    if (!('role' in loginInfo)) {
      res.status(401).json({ message: 'Missing workspace role' }).end()
      return
    }
    if (loginInfo.role !== AccountRole.Owner) {
      res.status(401).json({ message: 'Workspace owners only' }).end()
      return
    }
  }

  next()
}
