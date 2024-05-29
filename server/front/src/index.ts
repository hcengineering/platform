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

import { Analytics } from '@hcengineering/analytics'
import { MeasureContext, Blob as PlatformBlob, WorkspaceId, metricsAggregate } from '@hcengineering/core'
import { Token, decodeToken } from '@hcengineering/server-token'
import { StorageAdapter, removeAllObjects } from '@hcengineering/storage'
import bp from 'body-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import expressStaticGzip from 'express-static-gzip'
import https from 'https'
import morgan from 'morgan'
import { join, resolve } from 'path'
import { cwd } from 'process'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'
import { preConditions } from './utils'

const cacheControlValue = 'public, max-age=365d'
const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type SupportedFormat = 'jpeg' | 'avif' | 'heif' | 'webp' | 'png'
const supportedFormats: SupportedFormat[] = ['avif', 'webp', 'heif', 'jpeg', 'png']

async function storageUpload (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  workspace: WorkspaceId,
  file: UploadedFile
): Promise<string> {
  const id = uuid()

  const resp = await ctx.with(
    'storage upload',
    { workspace: workspace.name },
    async () => await storageAdapter.put(ctx, workspace, id, file.data, file.mimetype, file.size),
    { file: file.name, contentType: file.mimetype }
  )

  ctx.info('minio upload', resp)
  return id
}

function getRange (range: string, size: number): [number, number] {
  const [startStr, endStr] = range.replace(/bytes=/, '').split('-')

  let start = parseInt(startStr, 10)
  let end = endStr !== undefined ? parseInt(endStr, 10) : size - 1

  if (!isNaN(start) && isNaN(end)) {
    end = size - 1
  }

  if (isNaN(start) && !isNaN(end)) {
    start = size - end
    end = size - 1
  }

  return [start, end]
}

async function getFileRange (
  ctx: MeasureContext,
  stat: PlatformBlob,
  range: string,
  client: StorageAdapter,
  workspace: WorkspaceId,
  uuid: string,
  res: Response
): Promise<void> {
  const size: number = stat.size

  const [start, end] = getRange(range, size)

  if (start >= size || end >= size) {
    res.writeHead(416, {
      'Content-Range': `bytes */${size}`
    })
    res.end()
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with(
          'partial',
          {},
          async () => await client.partial(ctx, workspace, uuid, start, end - start + 1),
          {}
        )
        res.writeHead(206, {
          Connection: 'keep-alive',
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': stat.contentType,
          Etag: stat.etag,
          'Last-Modified': new Date(stat.modifiedOn).toISOString()
        })

        dataStream.pipe(res)

        await new Promise<void>((resolve, reject) => {
          dataStream.on('end', () => {
            dataStream.destroy()
            res.end()
            resolve()
          })
          dataStream.on('error', (err) => {
            ctx.error('error receive stream', { workspace: workspace.name, uuid, error: err })
            Analytics.handleError(err)
            res.end()
            reject(err)
          })
          dataStream.on('close', () => {
            res.end()
          })
        })
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.code === 'NotFound') {
          ctx.info('No such key', { workspace: workspace.name, uuid })
          res.status(404).send()
          return
        } else {
          Analytics.handleError(err)
          ctx.error(err)
        }
        res.status(500).send()
      }
    },
    { uuid, start, end: end - start + 1 }
  )
}

async function getFile (
  ctx: MeasureContext,
  stat: PlatformBlob,
  client: StorageAdapter,
  workspace: WorkspaceId,
  uuid: string,
  req: Request,
  res: Response
): Promise<void> {
  const etag = stat.etag

  if (
    preConditions.IfNoneMatch(req.headers, { etag }) === 'notModified' ||
    preConditions.IfMatch(req.headers, { etag }) === 'notModified' ||
    preConditions.IfModifiedSince(req.headers, { lastModified: new Date(stat.modifiedOn) }) === 'notModified'
  ) {
    // Matched, return not modified
    res.statusCode = 304
    res.end()
    return
  }
  if (preConditions.IfUnmodifiedSince(req.headers, { lastModified: new Date(stat.modifiedOn) }) === 'failed') {
    // Send 412 (Precondition Failed)
    res.statusCode = 412
    res.end()
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with('readable', {}, async () => await client.get(ctx, workspace, uuid))
        res.writeHead(200, {
          'Content-Type': stat.contentType,
          Etag: stat.etag,
          'Last-Modified': new Date(stat.modifiedOn).toISOString(),
          'Cache-Control': cacheControlValue
        })

        dataStream.pipe(res)
        await new Promise<void>((resolve, reject) => {
          dataStream.on('end', function () {
            res.end()
            dataStream.destroy()
            resolve()
          })
          dataStream.on('error', function (err) {
            Analytics.handleError(err)
            ctx.error('error', { err })
            reject(err)
          })
        })
      } catch (err: any) {
        ctx.error('get-file-error', { workspace: workspace.name, err })
        Analytics.handleError(err)
        res.status(500).send()
      }
    },
    {}
  )
}

/**
 * @public
 * @param port -
 */
export function start (
  ctx: MeasureContext,
  config: {
    transactorEndpoint: string
    elasticUrl: string
    storageAdapter: StorageAdapter
    accountsUrl: string
    uploadUrl: string
    modelVersion: string
    rekoniUrl: string
    telegramUrl: string
    gmailUrl: string
    calendarUrl: string
    collaboratorUrl: string
    brandingUrl?: string
    previewConfig: string
  },
  port: number,
  extraConfig?: Record<string, string | undefined>
): () => void {
  const app = express()

  app.use(cors())
  app.use(fileUpload())
  app.use(bp.json())
  app.use(bp.urlencoded({ extended: true }))

  class MyStream {
    write (text: string): void {
      ctx.info(text)
    }
  }

  const myStream = new MyStream()

  app.use(morgan('short', { stream: myStream }))

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/config.json', async (req, res) => {
    const data = {
      ACCOUNTS_URL: config.accountsUrl,
      UPLOAD_URL: config.uploadUrl,
      MODEL_VERSION: config.modelVersion,
      REKONI_URL: config.rekoniUrl,
      TELEGRAM_URL: config.telegramUrl,
      GMAIL_URL: config.gmailUrl,
      CALENDAR_URL: config.calendarUrl,
      COLLABORATOR_URL: config.collaboratorUrl,
      BRANDING_URL: config.brandingUrl,
      PREVIEW_CONFIG: config.previewConfig,
      ...(extraConfig ?? {})
    }
    res.set('Cache-Control', cacheControlNoCache)
    res.status(200)
    res.json(data)
  })

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.status(200)
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', cacheControlNoCache)

      const json = JSON.stringify({
        metrics: metricsAggregate((ctx as any).metrics),
        statistics: {
          activeSessions: {}
        },
        admin
      })
      res.end(json)
    } catch (err: any) {
      ctx.error('statistics error', { err })
      Analytics.handleError(err)
      res.writeHead(404, {})
      res.end()
    }
  })

  const dist = resolve(process.env.PUBLIC_DIR ?? cwd(), 'dist')
  console.log('serving static files from', dist)

  app.use(
    expressStaticGzip(dist, {
      serveStatic: {
        cacheControl: true,
        dotfiles: 'allow',
        maxAge: '365d',
        etag: true,
        lastModified: true,
        index: false,
        setHeaders (res, path) {
          if (path.toLowerCase().includes('index.html')) {
            res.setHeader('Cache-Control', cacheControlNoCache)
          }
        }
      }
    })
  )

  const filesHandler = async (req: Request<any>, res: Response<any>): Promise<void> => {
    await ctx.with(
      'handle-file',
      {},
      async (ctx) => {
        let payload: Token = { email: 'guest', workspace: { name: req.query.workspace as string, productId: '' } }
        try {
          const cookies = ((req?.headers?.cookie as string) ?? '').split(';').map((it) => it.trim().split('='))

          const token = cookies.find((it) => it[0] === 'presentation-metadata-Token')?.[1]
          payload = token !== undefined ? decodeToken(token) : payload

          let uuid = req.params.file ?? req.query.file
          if (uuid === undefined) {
            res.status(404).send()
            return
          }

          const format: SupportedFormat | undefined = supportedFormats.find((it) => uuid.endsWith(it))
          if (format !== undefined) {
            uuid = uuid.slice(0, uuid.length - format.length - 1)
          }

          const blobInfo = await ctx.with(
            'notoken-stat',
            { workspace: payload.workspace.name },
            async () => await config.storageAdapter.stat(ctx, payload.workspace, uuid)
          )

          if (blobInfo === undefined) {
            ctx.error('No such key', { file: uuid, workspace: payload.workspace })
            res.status(404).send()
            return
          }
          const isImage = blobInfo.contentType.includes('image/')

          if (token === undefined) {
            if (blobInfo !== undefined && !isImage) {
              // Do not allow to return non images with no token.
              if (token === undefined) {
                res.status(403).send()
                return
              }
            }
          }

          if (req.method === 'HEAD') {
            res.writeHead(200, {
              'accept-ranges': 'bytes',
              'content-length': blobInfo.size,
              Etag: blobInfo.etag,
              'Last-Modified': new Date(blobInfo.modifiedOn).toISOString()
            })
            res.status(200)

            res.end()
            return
          }

          const size = req.query.size !== undefined ? parseInt(req.query.size as string) : undefined
          if (format !== undefined && isImage && blobInfo.contentType !== 'image/gif') {
            uuid = await ctx.with(
              'resize',
              {},
              async () => await getGeneratePreview(ctx, size ?? -1, uuid, config, payload, format)
            )
          }

          const range = req.headers.range
          if (range !== undefined) {
            await ctx.with('file-range', { workspace: payload.workspace.name }, async (ctx) => {
              await getFileRange(ctx, blobInfo, range, config.storageAdapter, payload.workspace, uuid, res)
            })
          } else {
            await ctx.with(
              'file',
              { workspace: payload.workspace.name },
              async (ctx) => {
                await getFile(ctx, blobInfo, config.storageAdapter, payload.workspace, uuid, req, res)
              },
              { uuid }
            )
          }
        } catch (error: any) {
          if (error?.code === 'NoSuchKey' || error?.code === 'NotFound' || error?.message === 'No such key') {
            ctx.error('No such storage key', {
              file: req.query.file,
              workspace: payload?.workspace,
              email: payload?.email
            })
            res.status(404).send()
            return
          } else {
            ctx.error('error-handle-files', { error })
          }
          res.status(500).send()
        }
      },
      { url: req.path, query: req.query }
    )
  }

  app.get('/files', (req, res) => {
    void filesHandler(req, res)
  })

  app.head('/files/*', (req, res) => {
    void filesHandler(req, res)
  })

  app.get('/files/*', (req, res) => {
    void filesHandler(req, res)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/files', async (req, res) => {
    await ctx.with(
      'post-file',
      {},
      async (ctx) => {
        const file = req.files?.file as UploadedFile

        if (file === undefined) {
          res.status(400).send()
          return
        }

        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          res.status(403).send()
          return
        }

        try {
          const token = authHeader.split(' ')[1]
          const payload = decodeToken(token)
          const uuid = await storageUpload(ctx, config.storageAdapter, payload.workspace, file)

          res.status(200).send(uuid)
        } catch (error: any) {
          ctx.error('error-post-files', error)
          res.status(500).send()
        }
      },
      { url: req.path, query: req.query }
    )
  })

  const handleDelete = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }

      const token = authHeader.split(' ')[1]
      const payload = decodeToken(token)
      const uuid = req.query.file as string
      if (uuid === '') {
        res.status(500).send()
        return
      }

      // TODO: We need to allow delete only of user attached documents. (https://front.hc.engineering/workbench/platform/tracker/TSK-1081)
      await config.storageAdapter.remove(ctx, payload.workspace, [uuid])

      // TODO: Add support for related documents.
      // TODO: Move support of image resize/format change to separate place.
      await removeAllObjects(ctx, config.storageAdapter, payload.workspace, uuid)

      res.status(200).send()
    } catch (error: any) {
      Analytics.handleError(error)
      ctx.error('failed to delete', { url: req.url })
      res.status(500).send()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.delete('/files', handleDelete)

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.delete('/files/*', handleDelete)

  // todo remove it after update all customers chrome extensions
  app.get('/import', (req, res) => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }
      const token = authHeader.split(' ')[1]
      const payload = decodeToken(token)
      const url = req.query.url as string
      const cookie = req.query.cookie as string | undefined
      // const attachedTo = req.query.attachedTo as Ref<Doc> | undefined
      if (url === undefined) {
        res.status(500).send('URL param is not defined')
        return
      }

      console.log('importing from', url)
      console.log('cookie', cookie)

      const options =
        cookie !== undefined
          ? {
              headers: {
                Cookie: cookie
              }
            }
          : {}

      https
        .get(url, options, (response) => {
          if (response.statusCode !== 200) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            res.status(500).send(`server returned ${response.statusCode}`)
            return
          }
          const id = uuid()
          const contentType = response.headers['content-type'] ?? 'application/octet-stream'
          const data: Buffer[] = []
          response
            .on('data', function (chunk) {
              data.push(chunk)
            })
            .on('end', function () {
              const buffer = Buffer.concat(data)
              config.storageAdapter
                .put(ctx, payload.workspace, id, buffer, contentType, buffer.length)
                .then(async (objInfo) => {
                  res.status(200).send({
                    id,
                    contentType,
                    size: buffer.length
                  })
                })
                .catch((err: any) => {
                  if (err !== null) {
                    Analytics.handleError(err)
                    ctx.error('error', { err })
                    res.status(500).send(err)
                  }
                })
            })
            .on('error', function (err) {
              Analytics.handleError(err)
              ctx.error('error', { err })
              res.status(500).send(err)
            })
        })
        .on('error', (e) => {
          Analytics.handleError(e)
          ctx.error('error', { e })
          res.status(500).send(e)
        })
    } catch (error: any) {
      Analytics.handleError(error)
      ctx.error('error', { error })
      res.status(500).send()
    }
  })

  app.post('/import', (req, res) => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }
      const token = authHeader.split(' ')[1]
      const payload = decodeToken(token)
      const { url, cookie } = req.body
      if (url === undefined) {
        res.status(500).send('URL param is not defined')
        return
      }

      console.log('importing from', url)
      console.log('cookie', cookie)

      const options =
        cookie !== undefined
          ? {
              headers: {
                Cookie: cookie
              }
            }
          : {}

      https.get(url, options, (response) => {
        console.log('status', response.statusCode)
        if (response.statusCode !== 200) {
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          res.status(500).send(`server returned ${response.statusCode}`)
          return
        }
        const id = uuid()
        const contentType = response.headers['content-type']
        const data: Buffer[] = []
        response
          .on('data', function (chunk) {
            data.push(chunk)
          })
          .on('end', function () {
            const buffer = Buffer.concat(data)
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            config.storageAdapter
              .put(ctx, payload.workspace, id, buffer, contentType ?? 'application/octet-stream', buffer.length)
              .then(async () => {
                res.status(200).send({
                  id,
                  contentType,
                  size: buffer.length
                })
              })
              .catch((err: any) => {
                Analytics.handleError(err)
                ctx.error('error', { err })
                res.status(500).send(err)
              })
          })
          .on('error', function (err) {
            Analytics.handleError(err)
            ctx.error('error', { err })
            res.status(500).send(err)
          })
      })
    } catch (error: any) {
      Analytics.handleError(error)
      ctx.error('error', { error })
      res.status(500).send()
    }
  })

  const filesPatterns = [
    '.js',
    '.js.gz',
    'js.map',
    'js.map.gz',
    '.woff',
    '.woff2',
    '.svg.gz',
    '.css',
    '.css.gz',
    '.ico',
    '.svg',
    '.webp',
    '.png',
    '.avif'
  ]

  app.get('*', function (request, response) {
    if (filesPatterns.some((it) => request.path.endsWith(it))) {
      response.sendStatus(404)
      return
    }
    response.sendFile(join(dist, 'index.html'), {
      etag: true,
      lastModified: true,
      cacheControl: false,
      headers: {
        'Cache-Control': cacheControlNoCache
      }
    })
  })

  const server = app.listen(port)
  return () => {
    server.close()
  }
}

async function getGeneratePreview (
  ctx: MeasureContext,
  size: number | undefined,
  uuid: string,
  config: { storageAdapter: StorageAdapter },
  payload: Token,
  format: SupportedFormat = 'jpeg'
): Promise<string> {
  if (size === undefined) {
    return uuid
  }
  const sizeId = uuid + `%preview%${size}${format !== 'jpeg' ? format : ''}`

  const d = await config.storageAdapter.stat(ctx, payload.workspace, sizeId)
  const hasSmall = d !== undefined && d.size > 0

  if (hasSmall) {
    // We have cached small document, let's proceed with it.
    uuid = sizeId
  } else {
    // Let's get data and resize it
    const data = Buffer.concat(await config.storageAdapter.read(ctx, payload.workspace, uuid))

    let pipeline = sharp(data)

    // const metadata = await pipeline.metadata()

    if (size !== -1) {
      pipeline = pipeline.resize({
        width: size,
        fit: 'cover',
        withoutEnlargement: true
      })
    }

    let contentType = 'image/jpeg'
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({})
        contentType = 'image/jpeg'
        break
      case 'avif':
        pipeline = pipeline.avif({
          quality: size !== undefined && size < 128 ? undefined : 85
        })
        contentType = 'image/avif'
        break
      case 'heif':
        pipeline = pipeline.heif({
          quality: size !== undefined && size < 128 ? undefined : 80
        })
        contentType = 'image/heif'
        break
      case 'webp':
        pipeline = pipeline.webp()
        contentType = 'image/webp'
        break
      case 'png':
        pipeline = pipeline.png()
        contentType = 'image/png'
        break
    }

    const dataBuff = await pipeline.toBuffer()

    // Add support of avif as well.
    await config.storageAdapter.put(ctx, payload.workspace, sizeId, dataBuff, contentType, dataBuff.length)
    uuid = sizeId
  }
  return uuid
}
