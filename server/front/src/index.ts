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

import { WorkspaceId } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { decodeToken, Token } from '@hcengineering/server-token'
import bp from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express, { Response } from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import https from 'https'
import { join, resolve } from 'path'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'

async function minioUpload (minio: MinioService, workspace: WorkspaceId, file: UploadedFile): Promise<string> {
  const id = uuid()
  const meta: any = {
    'Content-Type': file.mimetype
  }

  const resp = await minio.put(workspace, id, file.data, file.size, meta)

  console.log(resp)
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
  range: string,
  client: MinioService,
  workspace: WorkspaceId,
  uuid: string,
  res: Response
): Promise<void> {
  const stat = await client.stat(workspace, uuid)

  const size: number = stat.size

  const [start, end] = getRange(range, size)

  if (start >= size || end >= size) {
    res.writeHead(416, {
      'Content-Range': `bytes */${size}`
    })
    res.end()
    return
  }

  try {
    const dataStream = await client.partial(workspace, uuid, start, end - start + 1)
    res.writeHead(206, {
      Connection: 'keep-alive',
      'Content-Range': `bytes ${start}-${end}/${size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': stat.metaData['content-type']
    })

    dataStream.pipe(res)
  } catch (err: any) {
    console.log(err)
    res.status(500).send()
  }
}

async function getFile (client: MinioService, workspace: WorkspaceId, uuid: string, res: Response): Promise<void> {
  const stat = await client.stat(workspace, uuid)

  try {
    const dataStream = await client.get(workspace, uuid)
    res.status(200)
    res.set('Cache-Control', 'max-age=7d')

    const contentType = stat.metaData['content-type']
    if (contentType !== undefined) {
      res.setHeader('Content-Type', contentType)
    }

    dataStream.on('data', function (chunk) {
      res.write(chunk)
    })
    dataStream.on('end', function () {
      res.end()
    })
    dataStream.on('error', function (err) {
      console.log(err)
      res.status(500).send()
    })
  } catch (err: any) {
    console.log(err)
    res.status(500).send()
  }
}

/**
 * @public
 * @param port -
 */
export function start (
  config: {
    transactorEndpoint: string
    elasticUrl: string
    minio: MinioService
    accountsUrl: string
    uploadUrl: string
    modelVersion: string
    rekoniUrl: string
    telegramUrl: string
    gmailUrl: string
    calendarUrl: string
    title?: string
    languages: string
    defaultLanguage: string
  },
  port: number,
  extraConfig?: Record<string, string>
): () => void {
  const app = express()

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression'] != null) {
          // don't compress responses with this request header
          return false
        }

        // fallback to standard filter function
        return compression.filter(req, res)
      },
      level: 6
    })
  )
  app.use(cors())
  app.use(fileUpload())
  app.use(bp.json())
  app.use(bp.urlencoded({ extended: true }))

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/config.json', async (req, res) => {
    res.status(200)
    res.set('Cache-Control', 'no-cache')
    res.json({
      ACCOUNTS_URL: config.accountsUrl,
      UPLOAD_URL: config.uploadUrl,
      MODEL_VERSION: config.modelVersion,
      REKONI_URL: config.rekoniUrl,
      TELEGRAM_URL: config.telegramUrl,
      GMAIL_URL: config.gmailUrl,
      CALENDAR_URL: config.calendarUrl,
      TITLE: config.title,
      LANGUAGES: config.languages,
      DEFAULT_LANGUAGE: config.defaultLanguage,
      ...(extraConfig ?? {})
    })
  })

  const dist = resolve(process.env.PUBLIC_DIR ?? __dirname, 'dist')
  console.log('serving static files from', dist)
  app.use(
    express.static(dist, {
      maxAge: '7d',
      setHeaders (res, path) {
        if (path.includes('index.html')) {
          res.setHeader('Cache-Control', 'public, max-age=0')
        }
      }
    })
  )

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.head('/files', async (req, res: Response) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      let uuid = req.query.file as string
      const size = req.query.size as 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'full'

      uuid = await getResizeID(size, uuid, config, payload)
      const stat = await config.minio.stat(payload.workspace, uuid)

      const fileSize = stat.size

      res.status(200)

      res.setHeader('accept-ranges', 'bytes')
      res.setHeader('content-length', fileSize)

      res.end()
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  })

  const filesHandler = async (req: any, res: Response): Promise<void> => {
    try {
      console.log(req.headers)
      const cookies = ((req?.headers?.cookie as string) ?? '').split(';').map((it) => it.trim().split('='))

      const token = cookies.find((it) => it[0] === 'presentation-metadata-Token')?.[1]
      const payload =
        token !== undefined
          ? decodeToken(token)
          : { email: 'guest', workspace: { name: req.query.workspace as string, productId: '' } }

      let uuid = req.query.file as string
      if (token === undefined) {
        try {
          const d = await config.minio.stat(payload.workspace, uuid)
          if (!((d.metaData['content-type'] as string) ?? '').includes('image')) {
            // Do not allow to return non images with no token.
            if (token === undefined) {
              res.status(403).send()
              return
            }
          }
        } catch (err) {}
      }

      const size = req.query.size as 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'full'

      uuid = await getResizeID(size, uuid, config, payload)

      const range = req.headers.range
      if (range !== undefined) {
        await getFileRange(range, config.minio, payload.workspace, uuid, res)
      } else {
        await getFile(config.minio, payload.workspace, uuid, res)
      }
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/files/', filesHandler)

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/files/*', filesHandler)

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/files', async (req, res) => {
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
      const uuid = await minioUpload(config.minio, payload.workspace, file)

      res.status(200).send(uuid)
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.delete('/files', async (req, res) => {
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
      await config.minio.remove(payload.workspace, [uuid])

      const extra = await config.minio.list(payload.workspace, uuid)
      if (extra.length > 0) {
        await config.minio.remove(
          payload.workspace,
          Array.from(extra.entries()).map((it) => it[1].name)
        )
      }

      res.status(200).send()
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  })

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
          const contentType = response.headers['content-type']
          const meta = {
            'Content-Type': contentType
          }
          const data: Buffer[] = []
          response
            .on('data', function (chunk) {
              data.push(chunk)
            })
            .on('end', function () {
              const buffer = Buffer.concat(data)
              config.minio
                .put(payload.workspace, id, buffer, 0, meta)
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
        const meta = {
          'Content-Type': contentType
        }
        const data: Buffer[] = []
        response
          .on('data', function (chunk) {
            data.push(chunk)
          })
          .on('end', function () {
            const buffer = Buffer.concat(data)
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            config.minio
              .put(payload.workspace, id, buffer, 0, meta)
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

  app.get('*', function (request, response) {
    response.setHeader('Cache-Control', 'max-age=0')
    response.sendFile(join(dist, 'index.html'))
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
  size: string,
  uuid: string,
  config: { minio: MinioService },
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
      const d = await config.minio.stat(payload.workspace, sizeId)
      hasSmall = d !== undefined && d.size > 0
    } catch (err) {}
    if (hasSmall) {
      // We have cached small document, let's proceed with it.
      uuid = sizeId
    } else {
      // Let's get data and resize it
      const data = Buffer.concat(await config.minio.read(payload.workspace, uuid))

      const dataBuff = await sharp(data)
        .resize({
          width
        })
        .jpeg()
        .toBuffer()
      await config.minio.put(payload.workspace, sizeId, dataBuff, dataBuff.length, {
        'Content-Type': 'image/jpeg'
      })
      uuid = sizeId
    }
  }
  return uuid
}
