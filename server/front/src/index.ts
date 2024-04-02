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

import { MeasureContext, WorkspaceId, metricsAggregate } from '@hcengineering/core'
import { StorageAdapter } from '@hcengineering/server-core'
import { Token, decodeToken } from '@hcengineering/server-token'
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
const cacheControlNoCache = 'max-age=1d, no-cache, must-revalidate'

async function minioUpload (
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

  await ctx.info('minio upload', resp)
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
  range: string,
  client: StorageAdapter,
  workspace: WorkspaceId,
  uuid: string,
  res: Response
): Promise<void> {
  const stat = await ctx.with('stats', {}, async () => await client.stat(ctx, workspace, uuid))
  if (stat === undefined) {
    await ctx.error('No such key', { file: uuid })
    res.status(404).send()
    return
  }
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
            console.error(err)
            res.end()
            reject(err)
          })
          dataStream.on('close', () => {
            res.end()
          })
        })
      } catch (err: any) {
        if (err?.code === 'NoSuchKey' || err?.code === 'NotFound') {
          console.log('No such key', workspace.name, uuid)
          res.status(404).send()
          return
        } else {
          console.log(err)
        }
        res.status(500).send()
      }
    },
    { uuid, start, end: end - start + 1 }
  )
}

async function getFile (
  ctx: MeasureContext,
  client: StorageAdapter,
  workspace: WorkspaceId,
  uuid: string,
  req: Request,
  res: Response
): Promise<void> {
  const stat = await ctx.with('stat', {}, async () => await client.stat(ctx, workspace, uuid))
  if (stat === undefined) {
    await ctx.error('No such key', { file: req.query.file })
    res.status(404).send()
    return
  }

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

        dataStream.on('data', function (chunk) {
          res.write(chunk)
        })
        await new Promise<void>((resolve, reject) => {
          dataStream.on('end', function () {
            res.end()
            dataStream.destroy()
            resolve()
          })
          dataStream.on('error', function (err) {
            res.status(500).send()
            console.log(err)
            reject(err)
          })
        })
      } catch (err: any) {
        console.log(err)
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
    collaboratorApiUrl: string
    title?: string
    languages: string
    defaultLanguage: string
    lastNameFirst?: string
  },
  port: number,
  extraConfig?: Record<string, string>
): () => void {
  const app = express()

  app.use(cors())
  app.use(fileUpload())
  app.use(bp.json())
  app.use(bp.urlencoded({ extended: true }))

  class MyStream {
    write (text: string): void {
      void ctx.info(text)
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
      COLLABORATOR_API_URL: config.collaboratorApiUrl,
      TITLE: config.title,
      LANGUAGES: config.languages,
      DEFAULT_LANGUAGE: config.defaultLanguage,
      LAST_NAME_FIRST: config.lastNameFirst,
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
      res.writeHead(200, { 'Content-Type': 'application/json' })

      const json = JSON.stringify({
        metrics: metricsAggregate((ctx as any).metrics),
        statistics: {
          activeSessions: {}
        },
        admin
      })
      res.set('Cache-Control', 'private, no-cache')
      res.end(json)
    } catch (err) {
      console.error(err)
      res.writeHead(404, {})
      res.end()
    }
  })

  const dist = resolve(process.env.PUBLIC_DIR ?? cwd(), 'dist')
  console.log('serving static files from', dist)

  app.use(
    expressStaticGzip(dist, {
      serveStatic: {
        maxAge: '365d',
        etag: true,
        lastModified: true,
        index: false
      }
    })
  )

  async function handleHead (ctx: MeasureContext, req: Request, res: Response): Promise<void> {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      let uuid = req.query.file as string
      const size = req.query.size as 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'full'

      uuid = await getResizeID(ctx, size, uuid, config, payload)
      const stat = await config.storageAdapter.stat(ctx, payload.workspace, uuid)
      if (stat === undefined) {
        await ctx.error('No such key', { file: req.query.file })
        res.status(404).send()
        return
      }

      const fileSize = stat.size

      res.writeHead(200, {
        'accept-ranges': 'bytes',
        'content-length': fileSize,
        Etag: stat.etag,
        'Last-Modified': new Date(stat.modifiedOn).toISOString()
      })
      res.status(200)

      res.end()
    } catch (error: any) {
      if (error?.code === 'NoSuchKey' || error?.code === 'NotFound') {
        await ctx.error('No such key', { file: req.query.file })
        res.status(404).send()
        return
      } else {
        await ctx.error('error-handle-files', error)
      }
      res.status(500).send()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.head('/files', (req, res) => {
    void ctx.with(
      'head-handle-file',
      {},
      async (ctx) => {
        await handleHead(ctx, req, res)
      },
      { url: req.path, query: req.query }
    )
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.head('/files/*', (req, res) => {
    void ctx.with(
      'head-handle-file',
      {},
      async (ctx) => {
        await handleHead(ctx, req, res)
      },
      { url: req.path, query: req.query }
    )
  })

  const filesHandler = async (ctx: MeasureContext, req: Request, res: Response): Promise<void> => {
    try {
      const cookies = ((req?.headers?.cookie as string) ?? '').split(';').map((it) => it.trim().split('='))

      const token = cookies.find((it) => it[0] === 'presentation-metadata-Token')?.[1]
      const payload =
        token !== undefined
          ? decodeToken(token)
          : { email: 'guest', workspace: { name: req.query.workspace as string, productId: '' } }

      let uuid = req.query.file as string
      if (token === undefined) {
        try {
          const d = await ctx.with(
            'notoken-stat',
            { workspace: payload.workspace.name },
            async () => await config.storageAdapter.stat(ctx, payload.workspace, uuid)
          )
          if (d !== undefined && !(d.contentType ?? '').includes('image')) {
            // Do not allow to return non images with no token.
            if (token === undefined) {
              res.status(403).send()
              return
            }
          }
        } catch (err) {}
      }

      const size = req.query.size as 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'full'

      uuid = await ctx.with('resize', {}, async () => await getResizeID(ctx, size, uuid, config, payload))

      const range = req.headers.range
      if (range !== undefined) {
        await ctx.with('file-range', { workspace: payload.workspace.name }, async (ctx) => {
          await getFileRange(ctx, range, config.storageAdapter, payload.workspace, uuid, res)
        })
      } else {
        await ctx.with(
          'file',
          { workspace: payload.workspace.name },
          async (ctx) => {
            await getFile(ctx, config.storageAdapter, payload.workspace, uuid, req, res)
          },
          { uuid }
        )
      }
    } catch (error: any) {
      if (error?.code === 'NoSuchKey' || error?.code === 'NotFound') {
        console.log('No such key', req.query.file)
        res.status(404).send()
        return
      } else {
        await ctx.error('error-handle-files', error)
      }
      res.status(500).send()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/files', (req, res) => {
    void ctx.with(
      'handle-file',
      {},
      async (ctx) => {
        await filesHandler(ctx, req, res)
      },
      { url: req.path, query: req.query }
    )
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/files/*', (req, res) => {
    void ctx.with(
      'handle-file*',
      {},
      async (ctx) => {
        await filesHandler(ctx, req, res)
      },
      { url: req.path, query: req.query }
    )
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
          const uuid = await minioUpload(ctx, config.storageAdapter, payload.workspace, file)

          res.status(200).send(uuid)
        } catch (error: any) {
          await ctx.error('error-post-files', error)
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
      const extra = await config.storageAdapter.list(ctx, payload.workspace, uuid)
      if (extra.length > 0) {
        await config.storageAdapter.remove(
          ctx,
          payload.workspace,
          Array.from(extra.entries()).map((it) => it[1]._id)
        )
      }

      res.status(200).send()
    } catch (error) {
      console.log(error)
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
          console.log('status', response.statusCode)
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
                  console.log('uploaded uuid', id, objInfo.etag)

                  res.status(200).send({
                    id,
                    contentType,
                    size: buffer.length
                  })
                })
                .catch((err) => {
                  if (err !== null) {
                    console.log('minio putObject error', err)
                    res.status(500).send(err)
                  }
                })
            })
            .on('error', function (err) {
              res.status(500).send(err)
            })
        })
        .on('error', (e) => {
          console.error(e)
          res.status(500).send(e)
        })
    } catch (error) {
      console.log(error)
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
                console.log('uploaded uuid', id)

                // if (attachedTo !== undefined) {
                //   const elastic = await createElasticAdapter(config.elasticUrl, payload.workspace)

                //   const indexedDoc: IndexedDoc = {
                //     id: id as Ref<Doc>,
                //     _class: attachment.class.Attachment,
                //     space,
                //     modifiedOn: Date.now(),
                //     modifiedBy: 'core:account:System' as Ref<Account>,
                //     attachedTo,
                //     data: buffer.toString('base64')
                //   }

                //   await elastic.index(indexedDoc)
                // }

                res.status(200).send({
                  id,
                  contentType,
                  size: buffer.length
                })
              })
              .catch((err) => {
                console.log('minio putObject error', err)
                res.status(500).send(err)
              })
          })
          .on('error', function (err) {
            res.status(500).send(err)
          })
      })
    } catch (error) {
      console.log(error)
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

// export type IconSize =
//   | 'inline'
//   | 'tiny'
//   | 'card'
//   | 'x-small'
//   | 'smaller'
//   | 'small'
//   | 'medium'
//   | 'large'
//   | 'x-large'
//   | '2x-large'
//   | 'full'
async function getResizeID (
  ctx: MeasureContext,
  size: string,
  uuid: string,
  config: { storageAdapter: StorageAdapter },
  payload: Token
): Promise<string> {
  if (size !== undefined && size !== 'full') {
    let width = 64
    switch (size) {
      case 'inline':
      case 'tiny':
      case 'card':
      case 'x-small':
      case 'smaller':
      case 'small':
      case 'medium':
        width = 64
        break
      case 'large':
        width = 256
        break
      case 'x-large':
        width = 512
        break
      case '2x-large':
        size = '2x-large_v2'
        width = 1024
        break
    }
    let hasSmall = false
    const sizeId = uuid + `%size%${width}`
    try {
      const d = await config.storageAdapter.stat(ctx, payload.workspace, sizeId)
      hasSmall = d !== undefined && d.size > 0
    } catch (err: any) {
      if (err.code !== 'NotFound') {
        console.error(err)
      }
    }
    if (hasSmall) {
      // We have cached small document, let's proceed with it.
      uuid = sizeId
    } else {
      // Let's get data and resize it
      const data = Buffer.concat(await config.storageAdapter.read(ctx, payload.workspace, uuid))

      const dataBuff = await sharp(data)
        .resize({
          width
        })
        .jpeg()
        .toBuffer()

      // Add support of avif as well.
      await config.storageAdapter.put(ctx, payload.workspace, sizeId, dataBuff, 'image/jpeg', dataBuff.length)
      uuid = sizeId
    }
  }
  return uuid
}
