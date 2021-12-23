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

import {
  ACCOUNT_DB,
  assignWorkspace,
  createAccount,
  createWorkspace,
  dropAccount,
  dropWorkspace,
  getAccount,
  listWorkspaces
} from '@anticrm/account'
import contact, { combineName } from '@anticrm/contact'
import core, { TxOperations } from '@anticrm/core'
import { program } from 'commander'
import { Client } from 'minio'
import { Db, MongoClient } from 'mongodb'
import { connect } from './connect'
import { rebuildElastic } from './elastic'
import { importXml } from './importer'
import { clearTelegramHistory } from './telegram'
import { diffWorkspace, dumpWorkspace, initWorkspace, restoreWorkspace, upgradeWorkspace } from './workspace'

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

const elasticUrl = process.env.ELASTIC_URL
if (elasticUrl === undefined) {
  console.error('please provide elastic url')
  process.exit(1)
}

const minio = new Client({
  endPoint: minioEndpoint,
  port: 9000,
  useSSL: false,
  accessKey: minioAccessKey,
  secretKey: minioSecretKey
})

async function withDatabase (uri: string, f: (db: Db, client: MongoClient) => Promise<any>): Promise<void> {
  console.log(`connecting to database '${uri}'...`)

  const client = await MongoClient.connect(uri)
  await f(client.db(ACCOUNT_DB), client)
  await client.close()
}

program.version('0.0.1')

// create-user john.appleseed@gmail.com --password 123 --workspace workspace --fullname "John Appleseed"
program
  .command('create-account <email>')
  .description('create user and corresponding account in master database')
  .requiredOption('-p, --password <password>', 'user password')
  .requiredOption('-f, --first <first>', 'first name')
  .requiredOption('-l, --last <last>', 'first name')
  .action(async (email: string, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      console.log(`creating account ${cmd.first as string} ${cmd.last as string} (${email})...`)
      await createAccount(db, email, cmd.password, cmd.first, cmd.last)
    })
  })

program
  .command('assign-workspace <email> <workspace>')
  .description('assign workspace')
  .action(async (email: string, workspace: string, cmd) => {
    return await withDatabase(mongodbUri, async (db, client) => {
      console.log(`retrieveing account from ${email}...`)
      const account = await getAccount(db, email)
      if (account === null) {
        throw new Error('account not found')
      }

      console.log(`assigning user ${email} to ${workspace}...`)
      await assignWorkspace(db, email, workspace)

      console.log('connecting to transactor...')
      const connection = await connect(transactorUrl, workspace)
      const ops = new TxOperations(connection, core.account.System)

      const name = combineName(account.first, account.last)

      console.log('create user in target workspace...')
      const employee = await ops.createDoc(contact.class.Employee, contact.space.Employee, {
        name,
        city: 'Mountain View',
        channels: []
      })

      console.log('create account in target workspace...')
      await ops.createDoc(contact.class.EmployeeAccount, core.space.Model, {
        email,
        employee,
        name
      })
      await connection.close()
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

program
  .command('upgrade-workspace <name>')
  .description('upgrade workspace')
  .action(async (workspace, cmd) => {
    await upgradeWorkspace(mongodbUri, workspace, transactorUrl, minio)
  })

program
  .command('drop-workspace <name>')
  .description('drop workspace')
  .action(async (workspace, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      await dropWorkspace(db, workspace)
    })
  })

program
  .command('list-workspaces')
  .description('List workspaces')
  .action(async () => {
    return await withDatabase(mongodbUri, async (db) => {
      const workspacesJSON = JSON.stringify(await listWorkspaces(db), null, 2)
      console.info(workspacesJSON)
    })
  })

program
  .command('drop-account <name>')
  .description('drop account')
  .action(async (email, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      await dropAccount(db, email)
    })
  })

program
  .command('dump-workspace <workspace> <dirName>')
  .description('dump workspace transactions and minio resources')
  .action(async (workspace, dirName, cmd) => {
    return await dumpWorkspace(mongodbUri, workspace, dirName, minio)
  })

program
  .command('restore-workspace <workspace> <dirName>')
  .description('restore workspace transactions and minio resources from previous dump.')
  .action(async (workspace, dirName, cmd) => {
    return await restoreWorkspace(mongodbUri, workspace, dirName, minio, elasticUrl)
  })

program
  .command('diff-workspace <workspace>')
  .description('restore workspace transactions and minio resources from previous dump.')
  .action(async (workspace, cmd) => {
    return await diffWorkspace(mongodbUri, workspace)
  })

program
  .command('clear-telegram-history')
  .description('clear telegram history')
  .option('-w, --workspace <workspace>', 'target workspace')
  .action(async (cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      const telegramDB = process.env.TELEGRAM_DATABASE
      if (telegramDB === undefined) {
        console.error('please provide TELEGRAM_DATABASE.')
        process.exit(1)
      }

      const workspaces = await listWorkspaces(db)
      const targetWorkspaces =
        cmd.workspace !== undefined ? workspaces.filter((x) => x.workspace === cmd.workspace) : workspaces

      for (const w of targetWorkspaces) {
        console.log(`clearing ${w.workspace} history:`)
        await clearTelegramHistory(mongodbUri, w.workspace, telegramDB)
      }
    })
  })

program
  .command('rebuild-elastic <workspace>')
  .description('rebuild elastic index')
  .action(async (workspace, cmd) => {
    await rebuildElastic(mongodbUri, workspace, minio, elasticUrl)
    console.log('rebuild end')
  })

program
  .command('import-xml <workspace> <fileName>')
  .description('dump workspace transactions and minio resources')
  .action(async (workspace, fileName, cmd) => {
    return await importXml(transactorUrl, workspace, minio, fileName, mongodbUri, elasticUrl)
  })

program.parse(process.argv)
