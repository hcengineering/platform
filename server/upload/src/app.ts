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

import express from 'express'
import fileUpload, { UploadedFile } from 'express-fileupload'
import cors from 'cors'
import { S3 } from 'aws-sdk'
import { v4 as uuid } from 'uuid'
import { decode } from 'jwt-simple'

import type { Space, Ref, Account, Doc } from '@anticrm/core'
import { TxFactory } from '@anticrm/core'
import type { Token } from '@anticrm/server-core'
import chunter from '@anticrm/chunter'
import { createContributingClient } from '@anticrm/contrib'

import { Client } from 'minio'

// import { createElasticAdapter } from '@anticrm/elastic'

const BUCKET = 'anticrm-upload-9e4e89c'

async function awsUpload (file: UploadedFile): Promise<string> {
  const id = uuid()
  const s3 = new S3()
  const resp = await s3.upload({
    Bucket: BUCKET,
    Key: id,
    Body: file.data,
    ContentType: file.mimetype,
    ACL: 'public-read'
  }).promise()
  console.log(resp)
  return id
}

async function minioUpload (minio: Client, workspace: string, file: UploadedFile): Promise<string> {
  const id = uuid()

  const resp = await minio.putObject(workspace, id, file.data)

  console.log(resp)
  return id
}

async function createAttachment (endpoint: string, token: string, account: Ref<Account>, space: Ref<Space>, attachmentTo: Ref<Doc>, collection: string, name: string, file: string): Promise<void> {
  const txFactory = new TxFactory(account)
  const tx = txFactory.createTxCreateDoc(chunter.class.Attachment, space, {
    attachmentTo,
    collection,
    name,
    file
  })
  const url = new URL(`/${token}`, endpoint)
  const client = await createContributingClient(url.href)
  await client.tx(tx)
  client.close()
}

/**
 * @public
 * @param port -
 */
export function start (transactorEndpoint: string, elasticUrl: string, minio: Client, port: number): void {
  const app = express()

  app.use(cors())
  app.use(fileUpload())

  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  app.post('/', async (req, res) => {
    const file = req.files?.file

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
      const fileId = await minioUpload(minio, payload.workspace, file as UploadedFile)

      const space = req.query.space as Ref<Space>
      const attachmentTo = req.query.attachmentTo as Ref<Doc>
      const name = req.query.name as string
      const collection = req.query.collection as string
      console.log('name', name)

      await createAttachment(
        transactorEndpoint,
        token,
        'core:account:System' as Ref<Account>,
        space,
        attachmentTo,
        collection,
        name,
        fileId
      )

      res.status(200).send()
    } catch (error) {
      console.log(error)
      res.status(500).send()
    }
  })

  app.listen(port)
}
