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
import { S3 } from 'aws-sdk'
import { v4 as uuid } from 'uuid'

const BUCKET = 'anticrm-upload-9e4e89c'

async function awsUpload(file: UploadedFile) {
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
}

/**
 * @public
 * @param port -
 */
export function start (port: number): void {
  const app = express()

  app.use(fileUpload())

  app.post('/', (req, res) => {
    const file = req.files?.file

    if (file !== undefined) {
      awsUpload(file as UploadedFile)
      .then(() => res.status(200).send())
      .catch(error => console.log(error))
    } else {
      res.status(400).send()
    }
  })

  app.listen(port)
}
