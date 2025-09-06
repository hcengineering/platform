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
import { getClient } from '@hcengineering/account-client'
import { MeasureContext, Tx, metricsAggregate } from '@hcengineering/core'
import { PlatformQueue, QueueTopic, getCPUInfo, getMemoryInfo } from '@hcengineering/server-core'
import { decodeToken, TokenError } from '@hcengineering/server-token'

import cors from 'cors'
import express, { type Express, type NextFunction, type Response } from 'express'
import fileUpload from 'express-fileupload'
import { type Server } from 'http'
import morgan from 'morgan'
import onHeaders from 'on-headers'

import { cacheControl } from './const'
import { createDb } from './datalake/db'
import { ApiError } from './error'
import {
  type RequestWithAuth,
  keepAlive,
  withAdminAuthorization,
  withAuthorization,
  withBlob,
  withWorkspace,
  withReadonly
} from './middleware'
import {
  handleBlobDelete,
  handleBlobDeleteList,
  handleBlobGet,
  handleBlobHead,
  handleBlobList,
  handleImageGet,
  handleMetaGet,
  handleMetaPut,
  handleMetaPatch,
  handleMultipartUploadAbort,
  handleMultipartUploadComplete,
  handleMultipartUploadPart,
  handleMultipartUploadStart,
  handleS3CreateBlob,
  handleS3CreateBlobParams,
  handleUploadFormData,
  handleBlobSetParent,
  handleWorkspaceStats
} from './handlers'
import { Datalake, Location } from './datalake'
import { DatalakeImpl } from './datalake/datalake'
import { Config } from './config'
import { createBucket, createClient, S3Bucket } from './s3'
import { TemporaryDir } from './tempdir'

const KEEP_ALIVE_TIMEOUT = 5 // seconds
const KEEP_ALIVE_MAX = 1000

const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type AsyncRequestHandler = (
  ctx: MeasureContext,
  req: RequestWithAuth,
  res: Response,
  datalake: Datalake,
  tempDir: TemporaryDir
) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  name: string,
  datalake: Datalake,
  tempDir: TemporaryDir,
  fn: AsyncRequestHandler,
  req: RequestWithAuth,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const source = req.token?.extra?.service ?? '🤦‍♂️user'
    await ctx.with(name, { source }, (ctx) => {
      onHeaders(res, () => {
        const measurements = ctx.metrics?.measurements
        if (measurements !== undefined) {
          const values = []
          for (const [k, v] of Object.entries(measurements)) {
            values.push(`${k};dur=${v.value.toFixed(2)}`)
          }
          if (values.length > 0) {
            if (!res.headersSent) {
              res.setHeader('Server-Timing', values.join(', '))
            }
          }
        }
      })
      return fn(ctx, req, res, datalake, tempDir)
    })
  } catch (err: unknown) {
    next(err)
  }
}

export async function createServer (
  ctx: MeasureContext,
  queue: PlatformQueue,
  config: Config
): Promise<{ app: Express, close: () => void }> {
  await ensureAccountReady(ctx, config)

  const buckets: Array<{ location: Location, bucket: S3Bucket }> = []
  for (const bucket of config.Buckets) {
    const location = bucket.location as Location
    if (
      location === 'eu' ||
      location === 'weur' ||
      location === 'eeur' ||
      location === 'wnam' ||
      location === 'enam' ||
      location === 'apac'
    ) {
      buckets.push({ location, bucket: await createBucket(ctx, createClient(bucket), bucket.bucket) })
    } else {
      ctx.warn('invalid bucket location', { location, bucket })
    }
  }

  const producer = queue.getProducer<Tx>(ctx.newChild('queue', {}, { span: false }), QueueTopic.Tx)

  const db = await createDb(ctx, config.DbUrl)
  const datalake = new DatalakeImpl(db, buckets, producer, { cacheControl, cache: config.Cache })
  const tempDir = new TemporaryDir(ctx, 'datalake-', config.CleanupInterval)

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '50mb' }))
  app.use(fileUpload({ useTempFiles: true, tempFileDir: tempDir.path }))
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
        handleRequest(ctx, name, datalake, tempDir, fn, req, res, next)
      }

  app.use(morgan('short', { stream: new LogStream() }))

  if (config.Readonly) {
    app.use(withReadonly)
  }

  app.get(
    '/stats/:workspace',
    withAdminAuthorization,
    withWorkspace,
    wrapRequest(ctx, 'workspaceStats', handleWorkspaceStats)
  )

  app.get('/blob/:workspace', withAdminAuthorization, withWorkspace, wrapRequest(ctx, 'listBlobs', handleBlobList))

  app.head('/blob/:workspace/:name', withBlob, wrapRequest(ctx, 'headBlob', handleBlobHead))

  app.head('/blob/:workspace/:name/:filename', withBlob, wrapRequest(ctx, 'headBlob', handleBlobHead))

  app.get('/blob/:workspace/:name', withBlob, wrapRequest(ctx, 'getBlob', handleBlobGet))

  app.get('/blob/:workspace/:name/:filename', withBlob, wrapRequest(ctx, 'getBlob', handleBlobGet))

  app.delete('/blob/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, 'deleteBlob', handleBlobDelete))

  app.delete(
    '/blob/:workspace/:name/:filename',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'deleteBlob', handleBlobDelete)
  )

  app.delete('/blob/:workspace', withAuthorization, withWorkspace, wrapRequest(ctx, 'deleteBlob', handleBlobDeleteList))

  // Blob parent

  app.patch(
    '/blob/:workspace/:name/parent',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'patchParent', handleBlobSetParent)
  )

  // Blob meta

  app.get('/meta/:workspace/:name', withBlob, wrapRequest(ctx, 'getMeta', handleMetaGet))

  app.put('/meta/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, 'putMeta', handleMetaPut))

  app.patch('/meta/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, 'patchMeta', handleMetaPatch))

  // Form Data upload

  app.post(
    '/upload/form-data/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, 'uploadFormData', handleUploadFormData)
  )

  // S3 upload

  app.get(
    '/upload/s3/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, 's3UploadParams', handleS3CreateBlobParams)
  )

  app.post('/upload/s3/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, 's3Upload', handleS3CreateBlob))

  // Multipart upload
  app.post(
    '/upload/multipart/:workspace/:name',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'multipartUploadStart', handleMultipartUploadStart)
  )

  app.put(
    '/upload/multipart/:workspace/:name/part',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'multipartUploadPart', handleMultipartUploadPart)
  )

  app.post(
    '/upload/multipart/:workspace/:name/complete',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'multipartUploadComplete', handleMultipartUploadComplete)
  )

  app.post(
    '/upload/multipart/:workspace/:name/abort',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'multipartUploadAvort', handleMultipartUploadAbort)
  )

  // Image

  app.get('/image/:transform/:workspace/:name', withBlob, wrapRequest(ctx, 'transformImage', handleImageGet)) // no auth

  const sendErrorToAnalytics = (err: any): boolean => {
    const ignoreMessages = [
      'Unexpected end of form', // happens when the client closes the connection before the upload is complete
      'Premature close', // happens when the client closes the connection before the upload is complete
      'File too large' // happens when the file exceeds the limit set by express-fileupload
    ]

    return !ignoreMessages.includes(err.message)
  }

  app.use((err: any, _req: any, res: any, _next: any) => {
    ctx.error(err.message, { code: err.code, message: err.message })
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }

    // do not send some errors to analytics
    if (sendErrorToAnalytics(err)) {
      Analytics.handleError(err)
    }

    res.status(500).json({ message: err.message?.length > 0 ? err.message : 'Internal Server Error' })
  })

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Connection', 'keep-alive')
      res.setHeader('Keep-Alive', 'timeout=5')
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
      Huly® Datalake™ <a href="https://huly.io">https://huly.io</a>
      © 2025 <a href="https://hulylabs.com">Huly Labs</a>
    `)
  })

  app.use((_req, res) => {
    res.status(404).json({ message: 'Not Found' })
  })

  return {
    app,
    close: () => {
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

async function ensureAccountReady (ctx: MeasureContext, config: Config): Promise<void> {
  const client = getClient(config.AccountsUrl)
  try {
    await client.getRegionInfo()
  } catch (err: any) {
    ctx.error('Accounts service not ready', { err })
    throw new Error('Accounts service not ready')
  }
}
