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

import { resolve } from 'path'
import { cwd } from 'process'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'
import { preConditions } from './utils'

import https from 'https'

import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import fastifyStatic from '@fastify/static'
import fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import { Readable } from 'stream'

const cacheControlValue = 'public, max-age=365d'
const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

type SupportedFormat = 'jpeg' | 'avif' | 'heif' | 'webp' | 'png'
const supportedFormats: SupportedFormat[] = ['avif', 'webp', 'heif', 'jpeg', 'png']

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
  res: FastifyReply
): Promise<void> {
  const size: number = stat.size

  const [start, end] = getRange(range, size)

  if (start >= size || end >= size) {
    await res
      .status(416)
      .headers({
        'content-range': `bytes */${size}`
      })
      .send()
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
          async (ctx) => await client.partial(ctx, workspace, stat._id, start, end - start + 1),
          {}
        )
        await res
          .status(206)
          .headers({
            Connection: 'keep-alive',
            'content-range': `bytes ${start}-${end}/${size}`,
            'accept-ranges': 'bytes',
            'content-length': end - start + 1,
            'content-type': stat.contentType,
            etag: stat.etag,
            'last-modified': new Date(stat.modifiedOn).toISOString()
          })
          .send(Readable.toWeb(dataStream))
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.code === 'NotFound') {
          ctx.info('No such key', { workspace: workspace.name, uuid })
          await res.status(404).send()
          return
        } else {
          Analytics.handleError(err)
          ctx.error(err)
        }
        await res.status(500).send()
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
  req: FastifyRequest,
  res: FastifyReply
): Promise<void> {
  const etag = stat.etag

  if (
    preConditions.IfNoneMatch(req.headers, { etag }) === 'notModified' ||
    preConditions.IfMatch(req.headers, { etag }) === 'notModified' ||
    preConditions.IfModifiedSince(req.headers, { lastModified: new Date(stat.modifiedOn) }) === 'notModified'
  ) {
    // Matched, return not modified
    await res
      .status(304)
      .headers({
        'content-type': stat.contentType,
        etag: stat.etag,
        'last-modified': new Date(stat.modifiedOn).toISOString(),
        'cache-control': cacheControlValue
      })
      .send()
    return
  }
  if (preConditions.IfUnmodifiedSince(req.headers, { lastModified: new Date(stat.modifiedOn) }) === 'failed') {
    // Send 412 (Precondition Failed)
    await res.status(412).send()
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with('readable', {}, async (ctx) => await client.get(ctx, workspace, stat._id))
        await res
          .status(200)
          .headers({
            'content-type': stat.contentType,
            etag: stat.etag,
            'last-modified': new Date(stat.modifiedOn).toISOString(),
            'cache-control': cacheControlValue
          })
          .send(Readable.toWeb(dataStream))
      } catch (err: any) {
        ctx.error('get-file-error', { workspace: workspace.name, err })
        Analytics.handleError(err)
        await res.status(500).send()
      }
    },
    {}
  )
}

/**
 * @public
 * @param port -
 */
export async function start (
  ctx: MeasureContext,
  config: {
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
    collaboratorApiUrl: string
    brandingUrl?: string
    previewConfig: string
  },
  port: number,
  extraConfig?: Record<string, string | undefined>
): Promise<() => void> {
  const httpLogger = ctx.newChild('http', {}, {}, ctx.logger.childLogger?.('http', {}))
  const app = fastify({
    logger: {
      level: 'info',
      stream: {
        write (msg) {
          httpLogger.info('http', JSON.parse(msg))
        }
      }
    }
  })

  const dist = resolve(process.env.PUBLIC_DIR ?? cwd(), 'dist')
  console.log('serving static files from', dist)

  let brandingUrl: URL | undefined
  if (config.brandingUrl !== undefined) {
    try {
      brandingUrl = new URL(config.brandingUrl)
    } catch (e) {
      console.error('Invalid branding URL. Must be absolute URL.', e)
    }
  }

  await app.register(fastifyStatic, {
    root: dist,
    prefix: '/', // optional: default '/'
    dotfiles: 'allow',
    acceptRanges: true,
    etag: true,
    wildcard: false,
    serveDotFiles: true,
    maxAge: '7d',
    preCompressed: true,
    cacheControl: true,
    list: false,
    lastModified: true,
    setHeaders: (res, path, stat) => {
      if (
        path.toLowerCase().includes('index.html') ||
        (brandingUrl !== undefined && path.toLowerCase().includes(brandingUrl.pathname))
      ) {
        void res.setHeader('cache-control', cacheControlNoCache)
      }
    }
  })

  await app.register(multipart, {
    limits: {
      fileSize: 512 * 1024 * 1024,
      files: 50
    }
  })

  await app.register(cors, {
    // put your options here
    credentials: true
  })

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
      COLLABORATOR_API_URL: config.collaboratorApiUrl,
      BRANDING_URL: config.brandingUrl,
      PREVIEW_CONFIG: config.previewConfig,
      ...(extraConfig ?? {})
    }
    await res
      .code(200)
      .headers({
        'cache-control': cacheControlNoCache,
        'content-type': 'application/json'
      })
      .send(JSON.stringify(data))
  })

  app.get(
    '/api/v1/statistics',
    async (
      req: FastifyRequest<{
        Querystring: { token: string }
      }>,
      res
    ) => {
      try {
        const token = req.query.token
        const payload = decodeToken(token)
        const admin = payload.extra?.admin === 'true'
        const json = JSON.stringify({
          metrics: metricsAggregate((ctx as any).metrics),
          statistics: {
            activeSessions: {}
          },
          admin
        })
        await res
          .status(200)
          .headers({
            'content-type': 'application/json',
            'cache-control': cacheControlNoCache
          })
          .send(json)
      } catch (err: any) {
        ctx.error('statistics error', { err })
        Analytics.handleError(err)
        await res.code(404)
      }
    }
  )

  // eslint-disable-next-line @typescript-eslint/ban-types
  const filesHandler = async (
    req: FastifyRequest<{
      Querystring: { workspace: string, token?: string, file: string, size?: string }
    }>,
    res: FastifyReply
  ): Promise<void> => {
    await ctx.with(
      'handle-file',
      {},
      async (ctx) => {
        let payload: Token = { email: 'guest', workspace: { name: req.query.workspace, productId: '' } }
        try {
          const cookies = ((req?.headers?.cookie as string) ?? '').split(';').map((it) => it.trim().split('='))

          const token = cookies.find((it) => it[0] === 'presentation-metadata-Token')?.[1] ?? req.query.token
          payload = token !== undefined ? decodeToken(token) : payload

          let uuid = req.query.file
          if (uuid === undefined) {
            await res.status(404).send()
            return
          }

          const format: SupportedFormat | undefined = supportedFormats.find((it) => uuid.endsWith(it))
          if (format !== undefined) {
            uuid = uuid.slice(0, uuid.length - format.length - 1)
          }

          let blobInfo = await ctx.with(
            'notoken-stat',
            { workspace: payload.workspace.name },
            async (ctx) => await config.storageAdapter.stat(ctx, payload.workspace, uuid)
          )

          if (blobInfo === undefined) {
            ctx.error('No such key', { file: uuid, workspace: payload.workspace })
            await res.status(404).send()
            return
          }

          // try image and octet streams
          const isImage =
            blobInfo.contentType.includes('image/') || blobInfo.contentType.includes('application/octet-stream')

          if (token === undefined) {
            if (blobInfo !== undefined && !isImage) {
              // Do not allow to return non images with no token.
              if (token === undefined) {
                await res.status(403).send()
                return
              }
            }
          }

          if (req.method === 'HEAD') {
            await res
              .status(200)
              .headers({
                'accept-ranges': 'bytes',
                'content-length': blobInfo.size,
                etag: blobInfo.etag,
                'last-modified': new Date(blobInfo.modifiedOn).toISOString()
              })
              .send()
            return
          }

          const size = req.query.size !== undefined ? parseInt(req.query.size) : undefined
          if (format !== undefined && isImage && blobInfo.contentType !== 'image/gif') {
            blobInfo = await ctx.with(
              'resize',
              {},
              async (ctx) =>
                await getGeneratePreview(ctx, blobInfo as PlatformBlob, size ?? -1, uuid, config, payload, format)
            )
          }

          const range = req.headers.range
          if (range !== undefined) {
            await ctx.with('file-range', { workspace: payload.workspace.name }, async (ctx) => {
              await getFileRange(ctx, blobInfo as PlatformBlob, range, config.storageAdapter, payload.workspace, res)
            })
          } else {
            await ctx.with(
              'file',
              { workspace: payload.workspace.name },
              async (ctx) => {
                await getFile(ctx, blobInfo as PlatformBlob, config.storageAdapter, payload.workspace, req, res)
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
            await res.status(404).send()
            return
          } else {
            ctx.error('error-handle-files', { error })
          }
          await res.status(500).send()
        }
      },
      { url: req.originalUrl, query: req.query }
    )
  }

  app.get('/files*', async (req, res) => {
    await filesHandler(req as any, res)
  })

  app.head('/files*', async (req, res) => {
    await filesHandler(req as any, res)
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/files', async (req, res) => {
    await ctx.with(
      'post-file',
      {},
      async (ctx) => {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          await res.status(403).send()
          return
        }
        try {
          const token = authHeader.split(' ')[1]
          const payload = decodeToken(token)
          let result = ''

          const parts = req.files()
          for await (const part of parts) {
            const id = uuid()

            const data = part.file
            const resp = await ctx.with(
              'storage upload',
              { workspace: payload.workspace.name },
              async (ctx) => await config.storageAdapter.put(ctx, payload.workspace, id, data, part.mimetype),
              { file: part.filename, contentType: part.mimetype }
            )
            result += (result.length > 0 ? ',' : '') + id

            ctx.info('uploaded', resp)
          }

          await res.code(200).send(result)
        } catch (error: any) {
          ctx.error('error-post-files', error)
          await res.code(500).send()
        }
      },
      { url: req.originalUrl, query: req.query }
    )
  })
  const handleDelete = async (
    req: FastifyRequest<{
      Querystring: { file: string }
    }>,
    res: FastifyReply
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        await res.code(403).send()
        return
      }

      const token = authHeader.split(' ')[1]
      const payload = decodeToken(token)
      const uuid = req.query.file
      if (uuid === '') {
        await res.code(500).send()
        return
      }

      // TODO: We need to allow delete only of user attached documents. (https://front.hc.engineering/workbench/platform/tracker/TSK-1081)
      await config.storageAdapter.remove(ctx, payload.workspace, [uuid])

      // TODO: Add support for related documents.
      // TODO: Move support of image resize/format change to separate place.
      await removeAllObjects(ctx, config.storageAdapter, payload.workspace, uuid)

      await res.code(200).send()
    } catch (error: any) {
      Analytics.handleError(error)
      ctx.error('failed to delete', { url: req.url })
      await res.code(500).send()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.delete('/files', async (req, res) => {
    await handleDelete(req as any, res)
  })

  // todo remove it after update all customers chrome extensions
  app.get(
    '/import',
    async (
      req: FastifyRequest<{
        Querystring: {
          url: string
          cookie?: string
        }
      }>,
      res
    ) => {
      try {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          await res.code(403).send()
          return
        }
        const token = authHeader.split(' ')[1]
        const payload = decodeToken(token)
        const url = req.query.url
        const cookie = req.query.cookie
        // const attachedTo = req.query.attachedTo as Ref<Doc> | undefined
        if (url === undefined) {
          await res.status(500).send('URL param is not defined')
          return
        }

        console.log('importing from', url)
        console.log('cookie', cookie)

        const options =
          cookie !== undefined
            ? {
                headers: {
                  cookie
                }
              }
            : {}

        https
          .get(url, options, (response) => {
            if (response.statusCode !== 200) {
              // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
              void res.status(500).send(`server returned ${response.statusCode}`)
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
                    void res.status(200).send({
                      id,
                      contentType,
                      size: buffer.length
                    })
                  })
                  .catch((err: any) => {
                    if (err !== null) {
                      Analytics.handleError(err)
                      ctx.error('error', { err })
                      void res.status(500).send(err)
                    }
                  })
              })
              .on('error', function (err) {
                Analytics.handleError(err)
                ctx.error('error', { err })
                void res.status(500).send(err)
              })
          })
          .on('error', (e) => {
            Analytics.handleError(e)
            ctx.error('error', { e })
            void res.status(500).send(e)
          })
      } catch (error: any) {
        Analytics.handleError(error)
        ctx.error('error', { error })
        void res.status(500).send()
      }
    }
  )

  app.post(
    '/import',
    async (
      req: FastifyRequest<{
        Body: {
          url: string
          cookie: string
        }
      }>,
      res
    ) => {
      try {
        const authHeader = req.headers.authorization
        if (authHeader === undefined) {
          await res.status(403).send()
          return
        }
        const token = authHeader.split(' ')[1]
        const payload = decodeToken(token)
        const { url, cookie } = req.body
        if (url === undefined) {
          await res.status(500).send('URL param is not defined')
          return
        }

        console.log('importing from', url)
        console.log('cookie', cookie)

        const options =
          cookie !== undefined
            ? {
                headers: {
                  cookie
                }
              }
            : {}

        https.get(url, options, (response) => {
          console.log('status', response.statusCode)
          if (response.statusCode !== 200) {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            void res.status(500).send(`server returned ${response.statusCode}`)
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
                  void res.status(200).send({
                    id,
                    contentType,
                    size: buffer.length
                  })
                })
                .catch((err: any) => {
                  Analytics.handleError(err)
                  ctx.error('error', { err })
                  void res.status(500).send(err)
                })
            })
            .on('error', function (err) {
              Analytics.handleError(err)
              ctx.error('error', { err })
              void res.status(500).send(err)
            })
        })
      } catch (error: any) {
        Analytics.handleError(error)
        ctx.error('error', { error })
        await res.status(500).send()
      }
    }
  )

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

  app.setNotFoundHandler(async (req, res) => {
    if (filesPatterns.some((it) => req.url.endsWith(it))) {
      await res.status(404).send()
      return
    }
    await res.sendFile('index.html', {
      etag: true,
      lastModified: true,
      cacheControl: false,
      maxAge: 0
    })
  })

  app.listen({ port, host: '' }, (err: any) => {
    if (err !== null) throw err
    // Server is now listening on ${address}
  })
  return () => {
    void app.close()
  }
}

async function getGeneratePreview (
  ctx: MeasureContext,
  blob: PlatformBlob,
  size: number | undefined,
  uuid: string,
  config: { storageAdapter: StorageAdapter },
  payload: Token,
  format: SupportedFormat = 'jpeg'
): Promise<PlatformBlob> {
  if (size === undefined) {
    return blob
  }
  const sizeId = uuid + `%preview%${size}${format !== 'jpeg' ? format : ''}`

  const d = await config.storageAdapter.stat(ctx, payload.workspace, sizeId)
  const hasSmall = d !== undefined && d.size > 0

  if (hasSmall) {
    // We have cached small document, let's proceed with it.
    return d
  } else {
    let data: Buffer
    try {
      // Let's get data and resize it
      data = Buffer.concat(await config.storageAdapter.read(ctx, payload.workspace, uuid))

      let pipeline = sharp(data)

      sharp.cache(false)

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
      pipeline.destroy()

      // Add support of avif as well.
      await config.storageAdapter.put(ctx, payload.workspace, sizeId, dataBuff, contentType, dataBuff.length)
      return (await config.storageAdapter.stat(ctx, payload.workspace, sizeId)) ?? blob
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('failed to resize image', {
        err,
        format,
        contentType: blob.contentType,
        uuid,
        size: blob.size,
        provider: blob.provider
      })

      // Return original in case of error
      return blob
    }
  }
}
