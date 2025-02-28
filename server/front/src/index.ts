//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2025 Hardcore Engineering Inc.
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
import { MeasureContext, Blob as PlatformBlob, WorkspaceIds, metricsAggregate, type Ref } from '@hcengineering/core'
import { TokenError, decodeToken } from '@hcengineering/server-token'
import { StorageAdapter } from '@hcengineering/storage'
import bp from 'body-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import expressStaticGzip from 'express-static-gzip'
import https from 'https'
import morgan from 'morgan'
import { join, normalize, resolve } from 'path'
import { cwd } from 'process'
import sharp, { type Sharp } from 'sharp'
import { v4 as uuid } from 'uuid'
import { getClient as getAccountClient } from '@hcengineering/account-client'
import { preConditions } from './utils'

import fs, { createReadStream, mkdtempSync } from 'fs'
import { rm, writeFile } from 'fs/promises'
import { tmpdir } from 'os'

const cacheControlValue = 'public, no-cache, must-revalidate, max-age=365d'
const cacheControlNoCache = 'public, no-store, no-cache, must-revalidate, max-age=0'

async function storageUpload (
  ctx: MeasureContext,
  storageAdapter: StorageAdapter,
  wsIds: WorkspaceIds,
  file: UploadedFile
): Promise<string> {
  const uuid = file.name
  const data = file.tempFilePath !== undefined ? fs.createReadStream(file.tempFilePath) : file.data
  const resp = await ctx.with(
    'storage upload',
    { workspace: wsIds.uuid },
    (ctx) => storageAdapter.put(ctx, wsIds, uuid, data, file.mimetype, file.size),
    { file: file.name, contentType: file.mimetype }
  )

  ctx.info('storage upload', resp)
  return uuid
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
  wsIds: WorkspaceIds,
  res: Response
): Promise<void> {
  const uuid = stat._id
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
          (ctx) => client.partial(ctx, wsIds, stat._id, start, end - start + 1),
          {}
        )
        res.writeHead(206, {
          Connection: 'keep-alive',
          'Keep-Alive': 'timeout=5',
          'Content-Range': `bytes ${start}-${end}/${size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': end - start + 1,
          'Content-Type': stat.contentType,
          'Content-Security-Policy': "default-src 'none';",
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
            ctx.error('error receive stream', { workspace: wsIds.uuid, uuid, error: err })
            Analytics.handleError(err)

            res.end()
            dataStream.destroy()
            reject(err)
          })
        })
      } catch (err: any) {
        if (
          err?.code === 'NoSuchKey' ||
          err?.code === 'NotFound' ||
          err?.message === 'No such key' ||
          err?.Code === 'NoSuchKey'
        ) {
          ctx.info('No such key', { workspace: wsIds.uuid, uuid })
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
  wsIds: WorkspaceIds,
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
    res.writeHead(304, {
      'content-type': stat.contentType,
      etag: stat.etag,
      'last-modified': new Date(stat.modifiedOn).toISOString(),
      'cache-control': cacheControlValue,
      connection: 'keep-alive',
      'keep-alive': 'timeout=5, max=1000'
    })
    res.end()
    return
  }
  if (preConditions.IfUnmodifiedSince(req.headers, { lastModified: new Date(stat.modifiedOn) }) === 'failed') {
    // Send 412 (Precondition Failed)
    res.writeHead(412, {
      'content-type': stat.contentType,
      etag: stat.etag,
      'last-modified': new Date(stat.modifiedOn).toISOString(),
      'cache-control': cacheControlValue,
      connection: 'keep-alive',
      'keep-alive': 'timeout=5, max=1000'
    })
    res.end()
    return
  }

  await ctx.with(
    'write',
    { contentType: stat.contentType },
    async (ctx) => {
      try {
        const dataStream = await ctx.with('readable', {}, (ctx) => client.get(ctx, wsIds, stat._id))
        res.writeHead(200, {
          'Content-Type': stat.contentType,
          'Content-Security-Policy': "default-src 'none';",
          'Content-Length': stat.size,
          Etag: stat.etag,
          'Last-Modified': new Date(stat.modifiedOn).toISOString(),
          'Cache-Control': cacheControlValue,
          connection: 'keep-alive',
          'keep-alive': 'timeout=5, max=1000'
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

            res.end()
            dataStream.destroy()
            reject(err)
          })
        })
      } catch (err: any) {
        ctx.error('get-file-error', { workspace: wsIds.uuid, err })
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
    storageAdapter: StorageAdapter
    accountsUrl: string
    accountsUrlInternal?: string
    uploadUrl: string
    filesUrl: string
    modelVersion: string
    version: string
    rekoniUrl: string
    telegramUrl: string
    gmailUrl: string
    calendarUrl: string
    collaborator?: string
    collaboratorUrl: string
    brandingUrl?: string
    previewConfig: string
    uploadConfig: string
    linkPreviewUrl?: string
    pushPublicKey?: string
    disableSignUp?: string
  },
  port: number,
  extraConfig?: Record<string, string | undefined>
): () => void {
  const app = express()

  const tempFileDir = mkdtempSync(join(tmpdir(), 'front-'))
  let temoFileIndex = 0

  function cleanupTempFiles (): void {
    const maxAge = 1000 * 60 * 60 // 1 hour
    fs.readdir(tempFileDir, (err, files) => {
      if (err != null) return
      files.forEach((file) => {
        const filePath = join(tempFileDir, file)
        fs.stat(filePath, (err, stats) => {
          if (err != null) return
          if (Date.now() - stats.mtime.getTime() > maxAge) {
            fs.unlink(filePath, () => {})
          }
        })
      })
    })
  }

  setInterval(cleanupTempFiles, 1000 * 60 * 15) // Run every 15 minutes

  app.use(cors())
  app.use(
    fileUpload({
      useTempFiles: true,
      tempFileDir
    })
  )
  app.use(bp.json())
  app.use(bp.urlencoded({ extended: true }))

  const childLogger = ctx.logger.childLogger?.('requests', {
    enableConsole: 'true'
  })
  const requests = ctx.newChild('requests', {}, {}, childLogger)

  class MyStream {
    write (text: string): void {
      requests.info(text)
    }
  }

  const myStream = new MyStream()

  app.use(morgan('short', { stream: myStream }))

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/config.json', async (req, res) => {
    const data = {
      ACCOUNTS_URL: config.accountsUrl,
      UPLOAD_URL: config.uploadUrl,
      FILES_URL: config.filesUrl,
      MODEL_VERSION: config.modelVersion,
      VERSION: config.version,
      REKONI_URL: config.rekoniUrl,
      TELEGRAM_URL: config.telegramUrl,
      GMAIL_URL: config.gmailUrl,
      CALENDAR_URL: config.calendarUrl,
      COLLABORATOR: config.collaborator,
      LINK_PREVIEW_URL: config.linkPreviewUrl,
      COLLABORATOR_URL: config.collaboratorUrl,
      BRANDING_URL: config.brandingUrl,
      PREVIEW_CONFIG: config.previewConfig,
      UPLOAD_CONFIG: config.uploadConfig,
      PUSH_PUBLIC_KEY: config.pushPublicKey,
      DISABLE_SIGNUP: config.disableSignUp,
      ...(extraConfig ?? {})
    }
    res.status(200)
    res.set('Cache-Control', cacheControlNoCache)
    res.set('Connection', 'keep-alive')
    res.set('Keep-Alive', 'timeout=5')
    res.json(data)
  })

  app.get('/api/v1/statistics', (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      const admin = payload.extra?.admin === 'true'
      res.status(200)
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
      res.end(json)
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
          if (
            path.toLowerCase().includes('index.html') ||
            (brandingUrl !== undefined && path.toLowerCase().includes(brandingUrl.pathname))
          ) {
            res.setHeader('Cache-Control', cacheControlNoCache)
          }
          res.setHeader('Connection', 'keep-alive')
          res.setHeader('Keep-Alive', 'timeout=5')
        }
      }
    })
  )

  const getWorkspaceIds = async (ctx: MeasureContext, token: string, path?: string): Promise<WorkspaceIds | null> => {
    const accountClient = getAccountClient(config.accountsUrlInternal ?? config.accountsUrl, token)
    const workspaceInfo = await accountClient.getWorkspaceInfo()
    const wsIds = {
      uuid: workspaceInfo.uuid,
      dataId: workspaceInfo.dataId,
      url: workspaceInfo.url
    }
    if (path === undefined) {
      return wsIds
    }

    const actualUuid = workspaceInfo.uuid
    const expectedUuid = path.split('/')[2]
    if (expectedUuid !== undefined && actualUuid !== expectedUuid) {
      ctx.error('Cannot validate uuid', {
        expectedUuid,
        actualUuid,
        path,
        workspaceUuid: workspaceInfo.uuid,
        workspaceDataId: workspaceInfo.dataId
      })
      return null
    }

    return wsIds
  }

  const filesHandler = async (req: Request<any>, res: Response<any>): Promise<void> => {
    await ctx.with(
      'handle-file',
      {},
      async (ctx) => {
        try {
          const cookies = ((req?.headers?.cookie as string) ?? '').split(';').map((it) => it.trim().split('='))

          const token =
            cookies.find((it) => it[0] === 'presentation-metadata-Token')?.[1] ??
            (req.query.token as string | undefined) ??
            ''
          const wsIds = await getWorkspaceIds(ctx, token, req.path)
          if (wsIds === null) {
            res.status(403).send()
            return
          }

          const uuid = req.params.file ?? req.query.file
          if (uuid === undefined) {
            res.status(404).send()
            return
          }

          let blobInfo = await ctx.with('stat', { workspace: wsIds.uuid }, (ctx) =>
            config.storageAdapter.stat(ctx, wsIds, uuid)
          )

          if (blobInfo === undefined) {
            ctx.error('No such key', { file: uuid, workspace: wsIds.uuid })
            res.status(404).send()
            return
          }

          if (req.method === 'HEAD') {
            res.writeHead(200, {
              'accept-ranges': 'bytes',
              connection: 'keep-alive',
              'Keep-Alive': 'timeout=5',
              'content-length': blobInfo.size,
              'content-security-policy': "default-src 'none';",
              Etag: blobInfo.etag,
              'Last-Modified': new Date(blobInfo.modifiedOn).toISOString()
            })
            res.status(200)

            res.end()
            return
          }
          // try image and octet streams
          const isImage =
            blobInfo.contentType.includes('image/') || blobInfo.contentType.includes('application/octet-stream')

          const size = req.query.size !== undefined ? parseInt(req.query.size as string) : undefined
          const accept = req.headers.accept
          if (accept !== undefined && isImage && blobInfo.contentType !== 'image/gif' && size !== undefined) {
            blobInfo = await ctx.with('resize', {}, (ctx) =>
              getGeneratePreview(ctx, blobInfo as PlatformBlob, size, uuid, config, wsIds, accept, () =>
                join(tempFileDir, `${++temoFileIndex}`)
              )
            )
          }

          const range = req.headers.range
          if (range !== undefined) {
            await ctx.with('file-range', { workspace: wsIds.uuid }, (ctx) =>
              getFileRange(ctx, blobInfo, range, config.storageAdapter, wsIds, res)
            )
          } else {
            await ctx.with(
              'file',
              { workspace: wsIds.uuid },
              (ctx) => getFile(ctx, blobInfo, config.storageAdapter, wsIds, req, res),
              { uuid }
            )
          }
        } catch (error: any) {
          if (
            error?.code === 'NoSuchKey' ||
            error?.code === 'NotFound' ||
            error?.message === 'No such key' ||
            error?.Code === 'NoSuchKey'
          ) {
            ctx.error('No such storage key', {
              file: req.query.file
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

  app.post('/files', (req, res) => {
    void handleUpload(req, res)
  })

  app.post('/files/*', (req, res) => {
    void handleUpload(req, res)
  })

  const handleUpload = async (req: Request, res: Response): Promise<void> => {
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
          const workspaceDataId = await getWorkspaceIds(ctx, token, req.path)
          if (workspaceDataId === null) {
            res.status(403).send()
            return
          }
          const uuid = await storageUpload(ctx, config.storageAdapter, workspaceDataId, file)

          res.status(200).send([
            {
              key: 'file',
              id: uuid
            }
          ])
        } catch (error: any) {
          ctx.error('error-post-files', error)
          res.status(500).send()
        }
      },
      { url: req.path, query: req.query }
    )
  }

  const handleDelete = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }

      const token = authHeader.split(' ')[1]
      const workspaceDataId = await getWorkspaceIds(ctx, token, req.path)
      if (workspaceDataId === null) {
        res.status(403).send()
        return
      }
      const uuid = req.query.file as string
      if (uuid === '') {
        res.status(500).send()
        return
      }

      // TODO: We need to allow delete only of user attached documents. (https://front.hc.engineering/workbench/platform/tracker/TSK-1081)
      await config.storageAdapter.remove(ctx, workspaceDataId, [uuid])

      res.status(200).send()
    } catch (error: any) {
      Analytics.handleError(error)
      ctx.error('failed to delete', { url: req.url })
      res.status(500).send()
    }
  }

  const handleImportGet = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }
      const token = authHeader.split(' ')[1]
      const workspaceDataId = await getWorkspaceIds(ctx, token)
      if (workspaceDataId === null) {
        res.status(403).send()
        return
      }
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
                .put(ctx, workspaceDataId, id, buffer, contentType, buffer.length)
                .then(async () => {
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
  }

  const handleImportPost = async (req: Request, res: Response): Promise<void> => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }
      const token = authHeader.split(' ')[1]
      const workspaceDataId = await getWorkspaceIds(ctx, token)
      if (workspaceDataId === null) {
        res.status(403).send()
        return
      }
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
              .put(ctx, workspaceDataId, id, buffer, contentType ?? 'application/octet-stream', buffer.length)
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
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.delete('/files', handleDelete)

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.delete('/files/*', handleDelete)

  // todo remove it after update all customers chrome extensions
  app.get('/import', (req, res) => {
    void handleImportGet(req, res)
  })

  app.post('/import', (req, res) => {
    void handleImportPost(req, res)
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

  app.get('*', (request, response) => {
    const safePath = normalize(join(dist, request.path))
    if (!safePath.startsWith(dist)) {
      response.sendStatus(403)
      return
    }
    if (filesPatterns.some((it) => request.path.endsWith(it))) {
      response.sendStatus(404)
      return
    }
    response.sendFile(join(dist, 'index.html'), {
      etag: true,
      lastModified: true,
      cacheControl: false,
      headers: {
        'Cache-Control': cacheControlNoCache,
        'Keep-Alive': 'timeout=5'
      }
    })
  })

  const server = app.listen(port)

  server.keepAliveTimeout = 60 * 1000 + 1000
  server.headersTimeout = 60 * 1000 + 2000
  return () => {
    server.close()
  }
}

const supportedFormats = ['avif', 'webp', 'heif', 'jpeg', 'png']

async function getGeneratePreview (
  ctx: MeasureContext,
  blob: PlatformBlob,
  size: number | undefined,
  uuid: string,
  config: { storageAdapter: StorageAdapter },
  wsIds: WorkspaceIds,
  accept: string,
  tempFile: () => string
): Promise<PlatformBlob> {
  if (size === undefined) {
    return blob
  }

  const formats = accept.split(',').map((it) => it.trim())

  // Select appropriate format
  let format: string | undefined

  for (const f of formats) {
    const [type] = f.split(';')
    const [clazz, kind] = type.split('/')
    if (clazz === 'image' && supportedFormats.includes(kind)) {
      format = kind
      break
    }
  }
  if (format === undefined) {
    return blob
  }

  if (size === -1) {
    size = 2048
  }

  if (size > 2048) {
    size = 2048
  }

  const sizeId = uuid + `%preview%${size}${format !== 'jpeg' ? format : ''}`

  const d = await config.storageAdapter.stat(ctx, wsIds, sizeId)
  const hasSmall = d !== undefined && d.size > 0

  if (hasSmall) {
    // We have cached small document, let's proceed with it.
    return d
  } else {
    const files: string[] = []
    let pipeline: Sharp | undefined
    try {
      // Let's get data and resize it
      const fname = tempFile()
      files.push(fname)
      await writeFile(fname, await config.storageAdapter.get(ctx, wsIds, uuid))

      pipeline = sharp(fname)
      const md = await pipeline.metadata()
      if (md.format === undefined) {
        // No format detected, return blob
        return blob
      }
      sharp.cache(false)

      pipeline = pipeline.resize({
        width: size,
        fit: 'cover',
        withoutEnlargement: true
      })

      let contentType = 'image/jpeg'
      switch (format) {
        case 'jpeg':
          pipeline = pipeline.jpeg({
            progressive: true
          })
          contentType = 'image/jpeg'
          break
        case 'avif':
          pipeline = pipeline.avif({
            lossless: false,
            effort: 0
          })
          contentType = 'image/avif'
          break
        case 'heif':
          pipeline = pipeline.heif({
            effort: 0
          })
          contentType = 'image/heif'
          break
        case 'webp':
          pipeline = pipeline.webp({
            effort: 0
          })
          contentType = 'image/webp'
          break
        case 'png':
          pipeline = pipeline.png({
            effort: 0
          })
          contentType = 'image/png'
          break
      }

      const outFile = tempFile()
      files.push(outFile)

      const dataBuff = await ctx.with('resize', { contentType }, () => (pipeline as Sharp).toFile(outFile))
      pipeline.destroy()

      // Add support of avif as well.
      const upload = await config.storageAdapter.put(
        ctx,
        wsIds,
        sizeId,
        createReadStream(outFile),
        contentType,
        dataBuff.size
      )
      return {
        ...blob,
        _id: sizeId as Ref<PlatformBlob>,
        size: dataBuff.size,
        contentType,
        etag: upload.etag
      }
    } catch (err: any) {
      Analytics.handleError(err)
      ctx.error('failed to resize image', {
        err,
        format: accept,
        contentType: blob.contentType,
        uuid,
        size: blob.size,
        provider: blob.provider
      })

      // Return original in case of error
      return blob
    } finally {
      pipeline?.destroy()
      for (const f of files) {
        await rm(f)
      }
    }
  }
}
