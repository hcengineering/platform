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

import { createRestTxOperations } from '@hcengineering/api-client'
import { type Class, type Doc, generateId, newMetrics, type Ref, type WorkspaceIds } from '@hcengineering/core'
import { StorageConfiguration, initStatisticsContext } from '@hcengineering/server-core'
import { buildStorageFromConfig } from '@hcengineering/server-storage'
import {
  getClient as getAccountClientRaw,
  AccountClient,
  isWorkspaceLoginInfo,
  type WorkspaceLoginInfo
} from '@hcengineering/account-client'
import { getPublicLink } from '@hcengineering/server-guest-resources'
import { createOpenTelemetryMetricsContext, SplitLogger } from '@hcengineering/analytics-service'
import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import { IncomingHttpHeaders, type Server } from 'http'
import { join } from 'path'

import config from './config'
import { convertToHtml } from './convert'
import { ApiError } from './error'
import { PrintOptions, print, validKinds } from './print'
import { withMeasureContext } from './middleware'

function getAccountClient (token: string): AccountClient {
  return getAccountClientRaw(config.AccountsUrl, token)
}

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

const extractToken = (headers: IncomingHttpHeaders, queryParams: any): string => {
  try {
    const token =
      extractAuthorizationToken(headers.authorization) ??
      extractQueryToken(queryParams) ??
      extractCookieToken(headers.cookie)

    if (token === null) {
      throw new ApiError(401)
    }

    return token
  } catch {
    throw new ApiError(401)
  }
}

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  wsIds: WorkspaceIds,
  wsLoginInfo: WorkspaceLoginInfo,
  next: NextFunction
) => Promise<void>

const handleRequest = async (
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractToken(req.headers, req.query)
    const wsLoginInfo = await getAccountClient(token).getLoginInfoByToken()
    if (!isWorkspaceLoginInfo(wsLoginInfo)) {
      throw new ApiError(401, "Couldn't find workspace with the provided token")
    }
    const wsIds = {
      uuid: wsLoginInfo.workspace,
      dataId: wsLoginInfo.workspaceDataId,
      url: wsLoginInfo.workspaceUrl
    }
    await fn(req, res, wsIds, wsLoginInfo, next)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest = (fn: AsyncRequestHandler) => (req: Request, res: Response, next: NextFunction) => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  handleRequest(fn, req, res, next)
}

function parsePrintOptions (query: Request['query']): PrintOptions {
  const kind = query.kind as PrintOptions['kind']

  if (kind !== undefined && !validKinds.includes(kind as any)) {
    throw new ApiError(400, `Invalid print kind: ${kind}`)
  }

  const rawWidth = (query.width ?? '') as string
  const rawHeight = (query.height ?? '') as string

  let viewport: PrintOptions['viewport'] | undefined
  if (rawWidth.length > 0 && rawHeight.length > 0) {
    viewport = {
      width: parseInt(rawWidth, 10),
      height: parseInt(rawHeight, 10)
    }

    if (Number.isNaN(viewport.width) || Number.isNaN(viewport.height)) {
      throw new ApiError(400, 'Invalid width or height')
    }
  } else if (rawWidth.length > 0 || rawHeight.length > 0) {
    throw new ApiError(400, 'Both width and height must be provided')
  }

  return { kind, viewport }
}

export function createServer (
  storageConfig: StorageConfiguration,
  allowedHostnames: string[]
): { app: Express, close: () => void } {
  const storageAdapter = buildStorageFromConfig(storageConfig)
  const measureCtx = initStatisticsContext('print', {
    factory: () =>
      createOpenTelemetryMetricsContext(
        'print',
        {},
        {},
        newMetrics(),
        new SplitLogger('print', {
          root: join(process.cwd(), 'logs'),
          enableConsole: (process.env.ENABLE_CONSOLE ?? 'true') === 'true'
        })
      )
  })
  const whitelistedHostnames = allowedHostnames.length > 0 ? new Set(allowedHostnames) : null

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(withMeasureContext({ ctx: measureCtx }))

  app.get(
    '/print',
    wrapRequest(async (req, res, wsIds, wsLoginInfo) => {
      const ctx = req.ctx
      const rawlink = req.query.link as string
      const link = decodeURIComponent(rawlink)

      // Verify that link is from the same host and protocol is among the allowed
      const url = new URL(link)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        (whitelistedHostnames != null && !whitelistedHostnames.has(url.hostname))
      ) {
        ctx.error('Rejected processing unexpected link', { link })
        throw new ApiError(403, 'Cannot process provided link')
      }

      const options = parsePrintOptions(req.query)

      const printRes = await ctx.with('print', { kind: options.kind }, (ctx) => print(ctx, link, options), {
        url,
        viewport: options.viewport
      })

      if (printRes === undefined) {
        throw new ApiError(400, 'Failed to print')
      }

      const printId = `print-${generateId()}`

      await storageAdapter.put(ctx, wsIds, printId, printRes, `application/${options.kind}`, printRes.length)

      res.contentType('application/json')
      res.send({ id: printId })
    })
  )

  app.get(
    '/convert/:file',
    wrapRequest(async (req, res, wsUuid) => {
      const convertableFormats = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      const ctx = req.ctx
      const file = req.params.file
      const stat = await storageAdapter.stat(ctx, wsUuid, file)

      if (stat === undefined) {
        throw new ApiError(404, `File ${file} not found`)
      }

      if (!convertableFormats.includes(stat.contentType)) {
        throw new ApiError(400, `File of this type (${stat.contentType}) cannot be converted`)
      }

      const convertId = getConvertId(file, stat.etag)
      const convertStats = await storageAdapter.stat(ctx, wsUuid, convertId)

      if (convertStats === undefined) {
        const originalFile = await storageAdapter.read(ctx, wsUuid, file)

        if (originalFile === undefined) {
          throw new ApiError(404, `File ${file} not found`)
        }

        const htmlRes = await ctx.with('convertToHtml', {}, () => convertToHtml(Buffer.concat(originalFile as any)))

        if (htmlRes === undefined) {
          throw new ApiError(400, 'Failed to convert')
        }

        const htmlBuf = Buffer.from(htmlRes)

        await storageAdapter.put(ctx, wsUuid, convertId, htmlBuf, 'text/html', htmlBuf.length)
      }

      res.contentType('application/json')
      res.send({ id: convertId })
    })
  )

  app.get(
    '/print/:objectClass/:objectId',
    wrapRequest(async (req, res, wsIds, wsLoginInfo) => {
      const ctx = req.ctx
      const objectId = req.params.objectId
      const objectClass = req.params.objectClass
      const options = parsePrintOptions(req.query)

      const transactorUrl = wsLoginInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
      const client = await createRestTxOperations(transactorUrl, wsLoginInfo.workspace, wsLoginInfo.token)

      try {
        const doc = await client.findOne(objectClass as Ref<Class<Doc>>, { _id: objectId as Ref<Doc> })
        if (doc === undefined) {
          throw new ApiError(404, 'Document not found')
        }

        const link = await getPublicLink(doc, client, wsIds, true, null)

        const printRes = await ctx.with('print', { kind: options.kind }, (ctx) => print(ctx, link, options), {
          link,
          viewport: options.viewport
        })

        if (printRes === undefined) {
          throw new ApiError(400, 'Failed to print')
        }

        const kind = options.kind
        const contentType = kind === 'pdf' || kind === undefined ? 'application/pdf' : `image/${kind}`
        res.contentType(contentType)
        res.send(printRes)
      } finally {
        await client.close()
      }
    })
  )

  app.use((err: any, _req: any, res: any, _next: any) => {
    measureCtx.error('error', { err })

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

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Print service has been started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}

function getConvertId (file: string, etag: string): string {
  return `${file}@${etag.replaceAll('"', '')}`
}
