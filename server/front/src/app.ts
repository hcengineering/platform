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
// import { TxFactory } from '@anticrm/core'
import type { IndexedDoc, Token } from '@anticrm/server-core'
import cors from 'cors'
import express from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import https from 'https'
import { decode } from 'jwt-simple'
// import { createContributingClient } from '@anticrm/contrib'
import { Client, ItemBucketMetadata } from 'minio'
import { join, resolve } from 'path'
import { v4 as uuid } from 'uuid'

// import { createElasticAdapter } from '@anticrm/elastic'

// const BUCKET = 'anticrm-upload-9e4e89c'

// async function awsUpload (file: UploadedFile): Promise<string> {
//   const id = uuid()
//   const s3 = new S3()
//   const resp = await s3.upload({
//     Bucket: BUCKET,
//     Key: id,
//     Body: file.data,
//     ContentType: file.mimetype,
//     ACL: 'public-read'
//   }).promise()
//   console.log(resp)
//   return id
// }

async function minioUpload (minio: Client, workspace: string, file: UploadedFile): Promise<string> {
  const id = uuid()
  const meta: ItemBucketMetadata = {
    'Content-Type': file.mimetype
  }

  const resp = await minio.putObject(workspace, id, file.data, file.size, meta)

  console.log(resp)
  return id
}

// async function createAttachment (endpoint: string, token: string, account: Ref<Account>, space: Ref<Space>, attachedTo: Ref<Doc>, collection: string, name: string, file: string): Promise<void> {
//   const txFactory = new TxFactory(account)
//   const tx = txFactory.createTxCreateDoc(chunter.class.Attachment, space, {
//     attachedTo,
//     collection,
//     name,
//     file
//   })
//   const url = new URL(`/${token}`, endpoint)
//   const client = await createContributingClient(url.href)
//   await client.tx(tx)
//   client.close()
// }

/**
 * @public
 * @param port -
 */
export function start (config: { transactorEndpoint: string, elasticUrl: string, minio: Client, accountsUrl: string, uploadUrl: string, modelVersion: string }, port: number): void {
  const app = express()

  app.use(cors())
  app.use(fileUpload())

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/config.json', async (req, res) => {
    res.status(200)
    res.set('Cache-Control', 'no-cache')
    res.json(
      {
        ACCOUNTS_URL: config.accountsUrl,
        UPLOAD_URL: config.uploadUrl,
        MODEL_VERSION: config.modelVersion
      }
    )
  })

  const dist = resolve(__dirname, 'dist')
  console.log('serving static files from', dist)
  app.use(express.static(dist, { maxAge: '10m' }))

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.get('/files', async (req, res) => {
    try {
      const token = req.query.token as string
      const payload = decode(token, 'secret', false) as Token
      const uuid = req.query.file as string

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
      const payload = decode(token ?? '', 'secret', false) as Token
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
      const payload = decode(token ?? '', 'secret', false) as Token
      const uuid = req.query.file as string

      await config.minio.removeObject(payload.workspace, uuid)

      res.status(200).send()
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  })

  app.get('/import', (req, res) => {
    const authHeader = req.headers.authorization
    if (authHeader === undefined) {
      res.status(403).send()
      return
    }
    const token = authHeader.split(' ')[1]
    const payload = decode(token ?? '', 'secret', false) as Token
    const url = req.query.url as string
    const cookie = req.query.cookie as string | undefined
    const attachedTo = req.query.attachedTo as Ref<Doc> | undefined

    console.log('importing from', url)
    console.log('cookie', cookie)

    const options = cookie !== undefined
      ? {
          headers: {
            Cookie: cookie
          }
        }
      : {}

    https.get(url, options, response => {
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
      response.on('data', function (chunk) {
        data.push(chunk)
      }).on('end', function () {
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
      }).on('error', function (err) {
        res.status(500).send(err)
      })
    })
  })

  app.get('*', function (request, response) {
    response.sendFile(join(dist, 'index.html'))
  })

  app.listen(port)
}
