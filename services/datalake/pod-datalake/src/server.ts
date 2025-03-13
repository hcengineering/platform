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
import { MeasureContext, metricsAggregate } from '@hcengineering/core'
import { decodeToken, TokenError } from '@hcengineering/server-token'

import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import fileUpload from 'express-fileupload'
import { mkdtempSync } from 'fs'
import { type Server } from 'http'
import { tmpdir } from 'os'
import { join } from 'path'

import { cacheControl } from './const'
import { createDb } from './datalake/db'
import { ApiError } from './error'
import { withAuthorization, withBlob, withWorkspace } from './middleware'
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
  handleS3CreateBlob,
  handleS3CreateBlobParams,
  handleUploadFormData
} from './handlers'
import { Datalake, Location } from './datalake'
import { DatalakeImpl } from './datalake/datalake'
import { Config } from './config'
import { createBucket, S3Bucket } from './s3'
import { createClient } from './s3/client'

const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type AsyncRequestHandler = (ctx: MeasureContext, req: Request, res: Response, datalake: Datalake) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  name: string,
  datalake: Datalake,
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await ctx.with(name, {}, (ctx) => fn(ctx, req, res, datalake))
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest =
  (ctx: MeasureContext, name: string, datalake: Datalake, fn: AsyncRequestHandler) =>
    (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleRequest(ctx, name, datalake, fn, req, res, next)
    }

export function createServer (ctx: MeasureContext, config: Config): { app: Express, close: () => void } {
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
      buckets.push({ location, bucket: createBucket(createClient(bucket), bucket.bucket) })
    } else {
      ctx.warn('invalid bucket location', { location, bucket })
    }
  }

  const db = createDb(ctx, config.DbUrl)
  const datalake = new DatalakeImpl(db, buckets, { cacheControl })

  const tempFileDir = mkdtempSync(join(tmpdir(), 'datalake-'))

  const app = express()
  app.use(cors())
  app.use(express.json())
  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir
    })
  )

  app.get('/blob/:workspace', withAuthorization, withWorkspace, wrapRequest(ctx, 'listBlobs', datalake, handleBlobList))

  app.head('/blob/:workspace/:name', withBlob, wrapRequest(ctx, 'headBlob', datalake, handleBlobHead))

  app.head('/blob/:workspace/:name/:filename', withBlob, wrapRequest(ctx, 'headBlob', datalake, handleBlobHead))

  app.get('/blob/:workspace/:name', withBlob, wrapRequest(ctx, 'getBlob', datalake, handleBlobGet))

  app.get('/blob/:workspace/:name/:filename', withBlob, wrapRequest(ctx, 'getBlob', datalake, handleBlobGet))

  app.delete(
    '/blob/:workspace/:name',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'deleteBlob', datalake, handleBlobDelete)
  )

  app.delete(
    '/blob/:workspace/:name/:filename',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'deleteBlob', datalake, handleBlobDelete)
  )

  app.delete(
    '/blob/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, 'deleteBlob', datalake, handleBlobDeleteList)
  )

  // Blob meta

  app.get('/meta/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, 'getMeta', datalake, handleMetaGet))

  app.put('/meta/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, 'putMeta', datalake, handleMetaPut))

  app.patch(
    '/meta/:workspace/:name',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 'patchMeta', datalake, handleMetaPatch)
  )

  // Form Data upload

  app.post(
    '/upload/form-data/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, 'uploadFormData', datalake, handleUploadFormData)
  )

  // S3 upload

  app.get(
    '/upload/s3/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, 's3UploadParams', datalake, handleS3CreateBlobParams)
  )

  app.post(
    '/upload/s3/:workspace/:name',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, 's3Upload', datalake, handleS3CreateBlob)
  )

  // // Multipart upload
  // app.post('/upload/multipart/:workspace/:name',
  //   withAuthorization,
  //   withBlob,
  //   wrapRequest(ctx, handleMultipartUploadStart)
  // )

  // app.post('/upload/multipart/:workspace/:name/part',
  //   withAuthorization,
  //   withBlob,
  //   wrapRequest(ctx, handleMultipartUploadPart)
  // )

  // app.post('/upload/multipart/:workspace/:name/complete',
  //   withAuthorization,
  //   withBlob,
  //   wrapRequest(ctx, handleMultipartUploadComplete)
  // )

  // Image

  app.get('/image/:transform/:workspace/:name', withBlob, wrapRequest(ctx, 'transformImage', datalake, handleImageGet)) // no auth

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.log(err)
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
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
          activeSessions: {}
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
    close: () => {}
  }
}

export function listen (e: Express, port: number, host?: string): Server {
  const cb = (): void => {
    console.log(`Service started at ${host ?? '*'}:${port}`)
  }

  return host !== undefined ? e.listen(port, host, cb) : e.listen(port, cb)
}
