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

import { MeasureContext } from '@hcengineering/core'
import { initStatisticsContext } from '@hcengineering/server-core'

import cors from 'cors'
import express, { type Express, type NextFunction, type Request, type Response } from 'express'
import fileUpload from 'express-fileupload'
import { mkdtempSync } from 'fs'
import { type Server } from 'http'
import { tmpdir } from 'os'

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
  handleS3CreateBlob,
  handleS3CreateBlobParams,
  handleUploadFormData
} from './handlers'
import { Datalake, Location } from './datalake'
import { DatalakeImpl } from './datalake/datalake'
import { Config } from './config'
import { createBucket, S3Bucket } from './s3'
import { createClient } from './s3/client'
import { join } from 'path'

type AsyncRequestHandler = (ctx: MeasureContext, req: Request, res: Response, datalake: Datalake) => Promise<void>

const handleRequest = async (
  ctx: MeasureContext,
  datalake: Datalake,
  fn: AsyncRequestHandler,
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await fn(ctx, req, res, datalake)
  } catch (err: unknown) {
    next(err)
  }
}

const wrapRequest =
  (ctx: MeasureContext, datalake: Datalake, fn: AsyncRequestHandler) =>
    (req: Request, res: Response, next: NextFunction) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handleRequest(ctx, datalake, fn, req, res, next)
    }

export function createServer (config: Config): { app: Express, close: () => void } {
  const ctx = initStatisticsContext('datalake', {})

  const buckets: Partial<Record<Location, S3Bucket>> = {}
  for (const bucket of config.Buckets) {
    const location = bucket.location as Location
    if (
      location === 'weur' ||
      location === 'eeur' ||
      location === 'wnam' ||
      location === 'enam' ||
      location === 'apac'
    ) {
      buckets[location] = createBucket(createClient(bucket), bucket.bucket)
    }
  }

  const db = createDb(ctx, config.DbUrl)
  const datalake = new DatalakeImpl(ctx, db, buckets, { cacheControl })

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

  app.get('/blob/:workspace', withAuthorization, withWorkspace, wrapRequest(ctx, datalake, handleBlobList))

  app.head('/blob/:workspace/:name', withBlob, wrapRequest(ctx, datalake, handleBlobHead))

  app.head('/blob/:workspace/:name/:filename', withBlob, wrapRequest(ctx, datalake, handleBlobHead))

  app.get('/blob/:workspace/:name', withBlob, wrapRequest(ctx, datalake, handleBlobGet))

  app.get('/blob/:workspace/:name/:filename', withBlob, wrapRequest(ctx, datalake, handleBlobGet))

  app.delete('/blob/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, datalake, handleBlobDelete))

  app.delete(
    '/blob/:workspace/:name/:filename',
    withAuthorization,
    withBlob,
    wrapRequest(ctx, datalake, handleBlobDelete)
  )

  app.delete('/blob/:workspace', withAuthorization, withWorkspace, wrapRequest(ctx, datalake, handleBlobDeleteList))

  // Form Data upload

  app.post(
    '/upload/form-data/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, datalake, handleUploadFormData)
  )

  // S3 upload

  app.get(
    '/upload/r2/:workspace',
    withAuthorization,
    withWorkspace,
    wrapRequest(ctx, datalake, handleS3CreateBlobParams)
  )

  app.post('/upload/r2/:workspace/:name', withAuthorization, withBlob, wrapRequest(ctx, datalake, handleS3CreateBlob))

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

  app.get('/image/:transform/:workspace/:name', withBlob, wrapRequest(ctx, datalake, handleImageGet)) // no auth

  app.use((err: any, _req: any, res: any, _next: any) => {
    console.log(err)
    if (err instanceof ApiError) {
      res.status(err.code).send({ code: err.code, message: err.message })
      return
    }

    res.status(500).json({ message: err.message?.length > 0 ? err.message : 'Internal Server Error' })
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
