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
import { MeasureContext, metricsAggregate, WorkspaceUuid } from '@hcengineering/core'
import { getCPUInfo, getMemoryInfo, StorageConfiguration } from '@hcengineering/server-core'
import { buildStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { decodeToken, TokenError } from '@hcengineering/server-token'

import cors from 'cors'
import express, { type Express, type NextFunction, type Response } from 'express'
import { createReadStream } from 'fs'
import { type Server } from 'http'
import morgan from 'morgan'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import { createCache } from './cache'
import { type Config } from './config'
import { type RequestWithAuth, errorHandler, keepAlive } from './middleware'
import { createPreviewService, ThumbnailParams } from './service'
import { TemporaryDir } from './tempdir'

const KEEP_ALIVE_TIMEOUT = 5 // seconds
const KEEP_ALIVE_MAX = 1000

const cacheControl = 'public, max-age=31536000, immutable'
const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type AsyncRequestHandler = (ctx: MeasureContext, req: RequestWithAuth, res: Response) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  name: string,
  fn: AsyncRequestHandler,
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const source = req.token?.extra?.service ?? '🤦‍♂️user'
    await ctx.with(name, { source }, (ctx) => {
      return fn(ctx, req, res)
    })
  } catch (err: unknown) {
    next(err)
  }
}

function getThumbnailParams (accept: string, transform: string): ThumbnailParams {
  const image = parseThumbnailParams(accept, transform)
  const format = image.format

  const dpr = image.dpr === undefined || Number.isNaN(image.dpr) ? 1 : image.dpr
  const width =
    image.width === undefined || Number.isNaN(image.width) ? undefined : Math.min(Math.round(image.width * dpr), 2048)
  const height =
    image.height === undefined || Number.isNaN(image.height)
      ? undefined
      : Math.min(Math.round(image.height * dpr), 2048)
  const fit = image.fit ?? 'cover'

  return { format, width, height, fit }
}

function parseThumbnailParams (accept: string, transform: string): ThumbnailParams & { dpr: number } {
  const prefferedImageFormats = ['webp', 'avif', 'jpeg', 'png']

  const params: ThumbnailParams & { dpr: number } = {
    width: undefined,
    height: undefined,
    format: 'png',
    dpr: 1,
    fit: 'cover'
  }

  // select format based on Accept header
  const formats = accept.split(',')
  for (const format of formats) {
    const [type] = format.split(';')
    const [clazz, kind] = type.split('/')
    if (clazz === 'image' && prefferedImageFormats.includes(kind)) {
      params.format = kind as ThumbnailParams['format']
      break
    }
  }

  // parse transforms
  transform.split(',').forEach((param) => {
    const [key, value] = param.split('=')
    switch (key) {
      case 'dpr':
        params.dpr = parseFloat(value)
        break
      case 'width':
        params.width = parseInt(value)
        break
      case 'height':
        params.height = parseInt(value)
        break
    }
  })

  return params
}

async function writeToResponse (
  ctx: MeasureContext,
  stream: Readable,
  res: Response,
  headers: { contentType: string, cacheControl: string }
): Promise<void> {
  res.setHeader('Content-Type', headers.contentType)
  res.setHeader('Cache-Control', headers.cacheControl)

  try {
    await pipeline(stream, res)
  } catch (err: any) {
    // ignore abort errors to avoid flooding the logs
    if (err.name === 'AbortError' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      return
    }
    Analytics.handleError(err)
    const error = err instanceof Error ? err.message : String(err)
    ctx.error('error writing response', { error })
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error')
    }
  }
}

export async function createServer (ctx: MeasureContext, config: Config): Promise<{ app: Express, close: () => void }> {
  const storageConfig: StorageConfiguration = storageConfigFromEnv()
  const storageAdapter = buildStorageFromConfig(storageConfig)
  const tempDir = new TemporaryDir(ctx, 'preview-')

  const cache = createCache(ctx, config.Cache)
  const service = createPreviewService(storageAdapter, cache, tempDir)

  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(keepAlive({ timeout: KEEP_ALIVE_TIMEOUT, max: KEEP_ALIVE_MAX }))

  const childLogger = ctx.logger.childLogger?.('requests', { enableConsole: 'true' })
  const requests = ctx.newChild('requests', {}, { logger: childLogger, span: false })
  class LogStream {
    write (text: string): void {
      requests.info(text)
    }
  }

  const wrapRequest =
    (ctx: MeasureContext, name: string, fn: AsyncRequestHandler) =>
      (req: RequestWithAuth, res: Response, next: NextFunction) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
        handleRequest(ctx, name, fn, req, res, next)
      }

  app.use(morgan('short', { stream: new LogStream() }))

  app.get(
    '/metadata/:workspace/:name',
    wrapRequest(ctx, 'getMetadata', async (ctx, req, res) => {
      const workspace = req.params.workspace as WorkspaceUuid
      const name = req.params.name

      const metadata = await service.metadata(ctx, workspace, name)
      res.status(200).json(metadata)
    })
  )

  app.get(
    '/image/:transform/:workspace/:name',
    wrapRequest(ctx, 'getThumbnail', async (ctx, req, res) => {
      const workspace = req.params.workspace as WorkspaceUuid
      const name = req.params.name

      const accept = req.headers.accept ?? 'image/*'
      const transform = req.params.transform
      const params = getThumbnailParams(accept, transform)

      const { mimeType: contentType, filePath } = await service.thumbnail(ctx, workspace, name, params)
      const stream = createReadStream(filePath)
      await writeToResponse(ctx, stream, res, { contentType, cacheControl })
    })
  )

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', cacheControlNoCache)

      const json = JSON.stringify({
        metrics: metricsAggregate((ctx as any).metrics),
        statistics: {
          cpu: getCPUInfo(),
          memory: getMemoryInfo()
        },
        admin
      })
      res.status(200).send(json)
    } catch (err: any) {
      if (err instanceof TokenError) {
        res.status(401).send()
        return
      }
      ctx.error('statistics error', { err })
      Analytics.handleError(err)
      res.status(404).send()
    }
  })

  app.get('/', (_req, res) => {
    res.send(`
      Huly&reg; Preview&trade; <a href="https://huly.io">https://huly.io</a>
      © 2025 <a href="https://hulylabs.com">Huly Labs</a>
    `)
  })

  app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' })
  })

  app.use(errorHandler({ ctx }))

  return {
    app,
    close: () => {
      void cache.close()
      void tempDir.close()
    }
  }
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Service started at ${host ?? '*'}:${port}`)
  }

  const server = host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT * 1000 + 1000
  server.headersTimeout = KEEP_ALIVE_TIMEOUT * 1000 + 2000

  return server
}
