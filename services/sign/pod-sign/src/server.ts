//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import { generateId, type WorkspaceIds } from '@hcengineering/core'
import { initStatisticsContext, StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { getClient as getAccountClientRaw, AccountClient, isWorkspaceLoginInfo } from '@hcengineering/account-client'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { type Server } from 'http'

import { type Branding, type BrandingMap, extractBranding } from './branding'
import config from './config'
import { ApiError } from './error'
import { signPDF } from './sign'
import { extractToken } from './token'

function getAccountClient (token: string): AccountClient {
  return getAccountClientRaw(config.AccountsUrl, token)
}

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  wsIds: WorkspaceIds,
  branding: Branding | null,
  next: NextFunction
) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  brandings: BrandingMap,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { rawToken } = extractToken(req.headers, req.query)
    const wsLoginInfo = await getAccountClient(rawToken).getLoginInfoByToken()
    if (!isWorkspaceLoginInfo(wsLoginInfo)) {
      throw new ApiError(401, "Couldn't find workspace with the provided token")
    }
    const wsIds = {
      uuid: wsLoginInfo.workspace,
      dataId: wsLoginInfo.workspaceDataId,
      url: wsLoginInfo.workspaceUrl
    }
    const branding = extractBranding(brandings, req.headers)
    await fn(req, res, wsIds, branding, next)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest =
  (brandings: BrandingMap, fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    handleRequest(fn, brandings, req, res, next)
  }

export function createServer (storageConfig: StorageConfiguration, brandings: BrandingMap): Express {
  const storageAdapter = buildStorageFromConfig(storageConfig)
  const measureCtx = initStatisticsContext('sign', {})

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.post(
    '/sign',
    wrapRequest(brandings, async (req, res, wsIds, branding) => {
      const fileId = req.body.fileId as string

      if (fileId === undefined) {
        throw new ApiError(400, 'Missing fileId')
      }

      const originalFile = await storageAdapter.read(measureCtx, wsIds, fileId)
      const ctx = {
        title: branding?.title ?? 'Huly'
      }
      const signRes = await signPDF(originalFile, config.Cert, config.CertPwd, ctx)

      if (signRes === undefined) {
        throw new ApiError(400, 'Failed to sign')
      }

      const signedId = `signed-${fileId}-${generateId()}`

      await storageAdapter.put(measureCtx, wsIds, signedId, signRes, 'application/pdf', signRes.length)

      res.contentType('application/json')
      res.send({ id: signedId })
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
    console.log(`Sign service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
