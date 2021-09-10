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
import { MongoClient, Db } from 'mongodb'
import { getAccount, createAccount, assignWorkspace, createWorkspace } from '@anticrm/account'
import { createContributingClient } from '@anticrm/contrib'
import core, { TxOperations } from '@anticrm/core'
import { encode } from 'jwt-simple'
import { Client } from 'minio'
import { initWorkspace } from './workspace'

import contact from '@anticrm/contact'

const mongodbUri = process.env.MONGO_URL
if (mongodbUri === undefined) {
  console.error('please provide mongodb url.')
  process.exit(1)
}

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

const minio = new Client({
  endPoint: minioEndpoint,
  port: 9000,
  useSSL: false,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey
})

async function withDatabase (uri: string, f: (db: Db) => Promise<any>): Promise<void> {
  console.log(`connecting to database '${uri}'...`)

  const client = await MongoClient.connect(uri)
  await f(client.db('account'))
  await client.close()
}

program.version('0.0.1')

// create-user john.appleseed@gmail.com --password 123 --workspace workspace --fullname "John Appleseed"
program
  .command('create-user <email>')
  .description('create user and corresponding account in master database')
  .requiredOption('-p, --password <password>', 'user password')
  .requiredOption('-f, --first <firstname>', 'first name')
  .requiredOption('-l, --last <lastname>', 'first name')
  .action(async (email: string, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      console.log(`creating account ${cmd.firstname as string} ${cmd.lastname as string} (${email})...`)
      await createAccount(db, email, cmd.password, cmd.firstname, cmd.lastname)
    })
  })

program
  .command('assign-workspace <email> <workspace>')
  .description('assign workspace')
  .action(async (email: string, workspace: string, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      console.log(`retrieveing account from ${email}...`)
      const account = await getAccount(db, email)
      if (account === null) {
        throw new Error('account not found')
      }
      console.log(`assigning user ${email} to ${workspace}...`)
      await assignWorkspace(db, email, workspace)
      const token = encode({ email: 'anticrm@hc.engineering', workspace }, 'secret')
      const url = new URL(`/${token}`, transactorUrl)
      const contrib = await createContributingClient(url.href)
      const txop = new TxOperations(contrib, core.account.System)
      const employee = await txop.createDoc(contact.class.Employee, contact.space.Employee, {
        firstName: account.first,
        lastName: account.last,
        city: 'Mountain View',
        channels: []
      })
      await txop.createDoc(contact.class.EmployeeAccount, core.space.Model, {
        email,
        employee
      })
    })
  })

program
  .command('show-user <email>')
  .description('show user')
  .action(async (email) => {
    return await withDatabase(mongodbUri, async (db) => {
      const info = await getAccount(db, email)
      console.log(info)
    })
  })

program
  .command('create-workspace <name>')
  .description('create workspace')
  .requiredOption('-o, --organization <organization>', 'organization name')
  .action(async (workspace, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      await createWorkspace(db, workspace, cmd.organization)
      await initWorkspace(mongodbUri, workspace, transactorUrl, minio)
    })
  })

program.parse(process.argv)
