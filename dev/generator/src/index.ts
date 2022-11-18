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

import { program } from 'commander'
import { MinioService } from '@hcengineering/minio'
import { generateIssues } from './issues'
import { generateContacts } from './recruit'
import { getWorkspaceId } from '@hcengineering/core'

const transactorUrl = process.env.TRANSACTOR_URL
if (transactorUrl === undefined) {
  console.error('please provide transactor url.')
  process.exit(1)
}

const minioEndpoint = process.env.MINIO_ENDPOINT
if (minioEndpoint === undefined) {
  console.error('please provide minio endpoint')
  process.exit(1)
}

const minioAccessKey = process.env.MINIO_ACCESS_KEY
if (minioAccessKey === undefined) {
  console.error('please provide minio access key')
  process.exit(1)
}

const minioSecretKey = process.env.MINIO_SECRET_KEY
if (minioSecretKey === undefined) {
  console.error('please provide minio secret key')
  process.exit(1)
}

const minio = new MinioService({
  endPoint: minioEndpoint,
  port: 9000,
  useSSL: false,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey
})

program.version('0.0.1')

// available types: recruit, issue
program
  .command('gen <genType> <workspace> <productId> <count>')
  .description('generate a bunch of random candidates with attachemnts and comments or issues')
  .option('-r, --random', 'generate random ids. So every call will add count <count> more candidates.', false)
  .option('-l, --lite', 'use same pdf and same account for applicant and candidates', false)
  .action(async (genType: string, workspace: string, productId: string, count: number, cmd) => {
    switch (genType) {
      case 'recruit':
        return await generateContacts(
          transactorUrl,
          getWorkspaceId(workspace, productId),
          {
            contacts: count,
            random: cmd.random as boolean,
            comments: { min: 1, max: 10, paragraphMin: 1, paragraphMax: 20, updateFactor: 30 },
            attachments: {
              min: 1,
              max: 3,
              deleteFactor: 20
            },
            vacancy: 3,
            applicants: { min: 50, max: 200, applicantUpdateFactor: 70 },
            lite: cmd.lite as boolean
          },
          minio
        )
      case 'issue':
        return await generateIssues(transactorUrl, getWorkspaceId(workspace, productId), {
          count
        })
      default:
        console.error(`Expected types: recruit, issue. Got type: ${genType}`)
    }
  })

program.parse(process.argv)
