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

const mongodbUri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017'

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
  .requiredOption('-f, --fullname <fullname>', 'full user name')
  .action(async (email, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      await createAccount(db, email, cmd.password)
      // await createContact(withTenant(client, cmd.workspace), email, cmd.fullname)
    })
  })

program
  .command('assign-workspace <email> <workspace>')
  .description('assign workspace')
  .action(async (email, workspace, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      console.log(`assigning user ${email as string} to ${workspace as string}...`)
      await assignWorkspace(db, email, workspace)
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

      // await initDatabase(withTenant(client, workspace))
    })
  })

program.parse(process.argv)
