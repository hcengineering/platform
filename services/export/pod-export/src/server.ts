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

import client, { ClientSocket } from '@hcengineering/client'
import { Class, Client, Doc, Ref, Space } from '@hcengineering/core'
import { ExportType, WorkspaceExporter } from '@hcengineering/importer'
import { setMetadata } from '@hcengineering/platform'
import { createClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { StorageConfiguration, initStatisticsContext } from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import { decodeToken } from '@hcengineering/server-token'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import fs, { rm } from 'fs/promises'
import { IncomingHttpHeaders, type Server } from 'http'
import { tmpdir } from 'os'
import { join } from 'path'
import WebSocket from 'ws'
import { ApiError } from './error'

const extractCookieToken = (cookie?: string): string | null => {
  if (cookie === undefined || cookie === null) {
    return null
  }

  const cookies = cookie.split(';')
  const tokenCookie = cookies.find((cookie) => cookie.toLocaleLowerCase().includes('token'))
  if (tokenCookie === undefined) {
    return null
  }

  const encodedToken = tokenCookie.split('=')[1]
  if (encodedToken === undefined) {
    return null
  }

  return encodedToken
}

const extractAuthorizationToken = (authorization?: string): string | null => {
  if (authorization === undefined || authorization === null) {
    return null
  }
  const encodedToken = authorization.split(' ')[1]

  if (encodedToken === undefined) {
    return null
  }

  return encodedToken
}

const extractQueryToken = (queryParams: any): string | null => {
  if (queryParams == null) {
    return null
  }

  const encodedToken = queryParams.token

  if (encodedToken == null) {
    return null
  }

  return encodedToken
}

const retrieveToken = (headers: IncomingHttpHeaders, queryParams: any): string => {
  try {
    const encodedToken =
      extractCookieToken(headers.cookie) ??
      extractAuthorizationToken(headers.authorization) ??
      extractQueryToken(queryParams)

    if (encodedToken === null) {
      throw new ApiError(401)
    }

    return encodedToken
  } catch {
    throw new ApiError(401)
  }
}

type AsyncRequestHandler = (req: Request, res: Response, token: string, next: NextFunction) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const encodedToken = retrieveToken(req.headers, req.query)
    await fn(req, res, encodedToken, next)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleRequest(fn, req, res, next)
}

export function createServer (storageConfig: StorageConfiguration): { app: Express, close: () => void } {
  const storageAdapter = buildStorageFromConfig(storageConfig)
  const measureCtx = initStatisticsContext('export', {})

  const app = express()
  app.use(cors())
  app.use(express.json())

  app.get(
    '/export',
    wrapRequest(async (req, res, token) => {
      const classId = req.query.class as Ref<Class<Doc<Space>>>
      const exportType = req.query.type as ExportType
      const { workspace } = decodeToken(token)

      if (classId == null || exportType == null) {
        throw new ApiError(400, 'Missing required parameters')
      }

      const tempDir = await fs.mkdtemp(join(tmpdir(), 'export-'))

      try {
        const client = await createPlatformClient(token)

        const exporter = new WorkspaceExporter(
          measureCtx,
          client,
          storageAdapter,
          {
            log: (msg: string) => { measureCtx.info('export', { msg }) },
            error: (msg: string, err?: any) => { measureCtx.error('export-error', { msg, err }) }
          },
          workspace
        )

        await exporter.exportDocuments(classId, exportType, tempDir)

        const files = await fs.readdir(tempDir)
        if (files.length === 0) {
          throw new ApiError(400, 'No files were exported')
        }

        const filePath = join(tempDir, files[0])

        res.download(filePath, `export-${Date.now()}.json`, (err) => {
          void (async () => {
            await rm(tempDir, { recursive: true, force: true })
            if (err != null) {
              measureCtx.error('export-download-error', { error: err })
            }
          })()
        })
      } catch (err: unknown) {
        await fs.rmdir(tempDir, { recursive: true })
        throw err
      }
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

  return {
    app,
    close: () => {
      void storageAdapter.close()
    }
  }
}

export async function createPlatformClient (token: string): Promise<Client> {
  setMetadata(client.metadata.ClientSocketFactory, (url) => {
    return new WebSocket(url, {
      headers: {
        'User-Agent': process.env.SERVICE_ID
      }
    }) as never as ClientSocket
  })

  const endpoint = await getTransactorEndpoint(token)
  const connection = await createClient(endpoint, token)

  return connection
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Export service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
