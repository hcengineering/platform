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

import attachment from '@anticrm/attachment'
import { Account, Doc, Ref, Space } from '@anticrm/core'
import { createElasticAdapter } from '@anticrm/elastic'
import type { IndexedDoc } from '@anticrm/server-core'
import { decodeToken, Token } from '@anticrm/server-token'
import bp from 'body-parser'
import compression from 'compression'
import cors from 'cors'
import express from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import https from 'https'
import { BucketItem, Client, ItemBucketMetadata } from 'minio'
import { join, resolve } from 'path'
import { v4 as uuid } from 'uuid'
import sharp from 'sharp'

async function minioUpload (minio: Client, workspace: string, file: UploadedFile): Promise<string> {
  const id = uuid()
  const meta: ItemBucketMetadata = {
    'Content-Type': file.mimetype
  }

  const resp = await minio.putObject(workspace, id, file.data, file.size, meta)

  console.log(resp)
  return id
}

async function readMinioData (client: Client, db: string, name: string): Promise<Buffer[]> {
  const data = await client.getObject(db, name)
  const chunks: Buffer[] = []

  await new Promise((resolve) => {
    data.on('readable', () => {
      let chunk
      while ((chunk = data.read()) !== null) {
        const b = chunk as Buffer
        chunks.push(b)
      }
    })

    data.on('end', () => {
      resolve(null)
    })
  })
  return chunks
}

/**
 * @public
 * @param port -
 */
export function start (
  config: {
    transactorEndpoint: string
    elasticUrl: string
    minio: Client
    accountsUrl: string
    uploadUrl: string
    modelVersion: string
  },
  port: number
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
      }
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
      MODEL_VERSION: config.modelVersion
    })
  })

  const dist = resolve(process.env.PUBLIC_DIR ?? __dirname, 'dist')
  console.log('serving static files from', dist)
  app.use(express.static(dist, { maxAge: '168h' }))

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/files', async (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decodeToken(token)
      let uuid = req.query.file as string
      const size = req.query.size as 'inline' | 'tiny' | 'x-small' | 'small' | 'medium' | 'large' | 'x-large' | 'full'

      uuid = await getResizeID(size, uuid, config, payload)

      const stat = await config.minio.statObject(payload.workspace, uuid)

      config.minio.getObject(payload.workspace, uuid, function (err, dataStream) {
        if (err !== null) {
          return console.log(err)
        }
        res.status(200)
        res.set('Cache-Control', 'max-age=604800')

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
        })
      })
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  })

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
      // const fileId = await awsUpload(file as UploadedFile)
      const uuid = await minioUpload(config.minio, payload.workspace, file)
      console.log('uploaded uuid', uuid)

      const space = req.query.space as Ref<Space> | undefined
      const attachedTo = req.query.attachedTo as Ref<Doc> | undefined

      // const name = req.query.name as string

      // await createAttachment(
      //   transactorEndpoint,
      //   token,
      //   'core:account:System' as Ref<Account>,
      //   space,
      //   attachedTo,
      //   collection,
      //   name,
      //   fileId
      // )

      if (space !== undefined && attachedTo !== undefined) {
        const elastic = await createElasticAdapter(config.elasticUrl, payload.workspace)

        const indexedDoc: IndexedDoc = {
          id: uuid as Ref<Doc>,
          _class: attachment.class.Attachment,
          space,
          modifiedOn: Date.now(),
          modifiedBy: 'core:account:System' as Ref<Account>,
          attachedTo,
          data: file.data.toString('base64')
        }

        await elastic.index(indexedDoc)
      }

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

      await config.minio.removeObject(payload.workspace, uuid)

      const extra = await listMinioObjects(config.minio, payload.workspace, uuid)
      if (extra.size > 0) {
        for (const e of extra.entries()) {
          await config.minio.removeObject(payload.workspace, e[1].name)
        }
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
      const attachedTo = req.query.attachedTo as Ref<Doc> | undefined
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
        const meta: ItemBucketMetadata = {
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
            config.minio.putObject(payload.workspace, id, buffer, 0, meta, async (err, objInfo) => {
              if (err !== null) {
                console.log('minio putObject error', err)
                res.status(500).send(err)
              } else {
                console.log('uploaded uuid', id)

                if (attachedTo !== undefined) {
                  const space = req.query.space as Ref<Space>
                  const elastic = await createElasticAdapter(config.elasticUrl, payload.workspace)

                  const indexedDoc: IndexedDoc = {
                    id: id as Ref<Doc>,
                    _class: attachment.class.Attachment,
                    space,
                    modifiedOn: Date.now(),
                    modifiedBy: 'core:account:System' as Ref<Account>,
                    attachedTo,
                    data: buffer.toString('base64')
                  }

                  await elastic.index(indexedDoc)
                }

                res.status(200).send({
                  id,
                  contentType,
                  size: buffer.length
                })
              }
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

  app.post('/import', (req, res) => {
    try {
      const authHeader = req.headers.authorization
      if (authHeader === undefined) {
        res.status(403).send()
        return
      }
      const token = authHeader.split(' ')[1]
      const payload = decodeToken(token)
      const { url, cookie, attachedTo, space } = req.body
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
        const meta: ItemBucketMetadata = {
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
            config.minio.putObject(payload.workspace, id, buffer, 0, meta, async (err, objInfo) => {
              if (err !== null) {
                console.log('minio putObject error', err)
                res.status(500).send(err)
              } else {
                console.log('uploaded uuid', id)

                if (attachedTo !== undefined) {
                  const elastic = await createElasticAdapter(config.elasticUrl, payload.workspace)

                  const indexedDoc: IndexedDoc = {
                    id: id as Ref<Doc>,
                    _class: attachment.class.Attachment,
                    space,
                    modifiedOn: Date.now(),
                    modifiedBy: 'core:account:System' as Ref<Account>,
                    attachedTo,
                    data: buffer.toString('base64')
                  }

                  await elastic.index(indexedDoc)
                }

                res.status(200).send({
                  id,
                  contentType,
                  size: buffer.length
                })
              }
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
    response.sendFile(join(dist, 'index.html'))
  })

  const server = app.listen(port)
  return () => {
    server.close()
  }
}
async function getResizeID (size: string, uuid: string, config: { minio: Client }, payload: Token): Promise<string> {
  if (size !== undefined && size !== 'full') {
    let width = 64
    switch (size) {
      case 'inline':
      case 'tiny':
      case 'x-small':
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
    }
    let hasSmall = false
    const sizeId = uuid + `%size%${width}`
    try {
      const d = await config.minio.statObject(payload.workspace, sizeId)
      hasSmall = d !== undefined && d.size > 0
    } catch (err) {}
    if (hasSmall) {
      // We have cached small document, let's proceed with it.
      uuid = sizeId
    } else {
      // Let's get data and resize it
      const data = Buffer.concat(await readMinioData(config.minio, payload.workspace, uuid))

      const dataBuff = await sharp(data)
        .resize({
          width
        })
        .jpeg()
        .toBuffer()
      await config.minio.putObject(payload.workspace, sizeId, dataBuff, {
        'Content-Type': 'image/jpeg'
      })
      uuid = sizeId
    }
  }
  return uuid
}

async function listMinioObjects (
  client: Client,
  db: string,
  prefix: string
): Promise<Map<string, BucketItem & { metaData: ItemBucketMetadata }>> {
  const items = new Map<string, BucketItem & { metaData: ItemBucketMetadata }>()
  const list = await client.listObjects(db, prefix, true)
  await new Promise((resolve) => {
    list.on('data', (data) => {
      items.set(data.name, { metaData: {}, ...data })
    })
    list.on('end', () => {
      resolve(null)
    })
  })
  return items
}
