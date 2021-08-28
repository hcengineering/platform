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
import { MongoClient, Db } from 'mongodb'
import { decode } from 'jwt-simple'

import type { TxCreateDoc, Ref, Account } from '@anticrm/core'
import { TxFactory } from '@anticrm/core'
import type { Token } from '@anticrm/server-core'
import type { Attachment } from '@anticrm/chunter'
import chunter from '@anticrm/chunter'

import { createElasticAdapter } from '@anticrm/elastic'

const BUCKET = 'anticrm-upload-9e4e89c'

async function awsUpload (file: UploadedFile): Promise<S3.ManagedUpload.SendData> {
  console.log(file)
  const s3 = new S3()
  const resp = await s3.upload({
    Bucket: BUCKET,
    Key: uuid(),
    Body: file.data,
    ContentType: file.mimetype,
    ACL: 'public-read'
  }).promise()
  console.log(resp)
  return resp
}

async function createAttachment(db: Db) {
  const txFactory = new TxFactory('core:account:System' as Ref<Account>)
  txFactory.createTxCreateDoc(chunter.class.Attachment, )
}

/**
 * @public
 * @param port -
 */
export async function start (mongoUrl: string, elasticUrl: string, port: number): Promise<void> {
  const app = express()

  app.use(cors())
  app.use(fileUpload())

  const mongo = new MongoClient(mongoUrl)
  await mongo.connect()

  app.post('/', async (req, res) => {
    const file = req.files?.file

    if (file !== undefined) {
      try { 
        const authHeader = req.headers.authorization
        if (authHeader) {
          const token = authHeader.split(' ')[1];
          const payload = decode(token ?? '', 'secret', false) as Token          
          await awsUpload(file as UploadedFile)

          const space = req.query.space as Ref<Space>
          console.log('space', space)
          const db = mongo.db(payload.workspace)
          await createAttachment(db)

          res.status(200).send()
        } else {
          res.status(403).send()
        }
      } catch (error) {
        console.log(error)
        res.status(500).send()
      }
    } else {
      res.status(400).send()
    }
  })

  app.listen(port)
}
