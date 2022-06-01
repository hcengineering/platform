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
  getWorkspace,
  listAccounts,
  listWorkspaces,
  upgradeWorkspace
} from '@anticrm/account'
import { setMetadata } from '@anticrm/platform'
import { backup, backupList, createFileBackupStorage, createMinioBackupStorage, restore } from '@anticrm/server-backup'
import { decodeToken, generateToken } from '@anticrm/server-token'
import toolPlugin, { prepareTools, version } from '@anticrm/server-tool'
import { program } from 'commander'
import { Db, MongoClient } from 'mongodb'
import { exit } from 'process'
import { rebuildElastic } from './elastic'
import { importXml } from './importer'
import { updateCandidates } from './recruit'
import { clearTelegramHistory } from './telegram'
import { diffWorkspace, dumpWorkspace, restoreWorkspace } from './workspace'

const { mongodbUri, minio } = prepareTools()

const transactorUrl = process.env.TRANSACTOR_URL
if (transactorUrl === undefined) {
  console.error('please provide transactor url.')
  process.exit(1)
}

const elasticUrl = process.env.ELASTIC_URL
if (elasticUrl === undefined) {
  console.error('please provide elastic url')
  process.exit(1)
}

setMetadata(toolPlugin.metadata.Endpoint, transactorUrl)
setMetadata(toolPlugin.metadata.Transactor, transactorUrl)

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
  .requiredOption('-l, --last <last>', 'last name')
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
      console.log(`assigning user ${email} to ${workspace}...`)
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
    })
  })

program
  .command('upgrade-workspace <name>')
  .description('upgrade workspace')
  .action(async (workspace, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      await upgradeWorkspace(db, workspace)
    })
  })

program
  .command('upgrade')
  .description('upgrade')
  .action(async (cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      const workspaces = await listWorkspaces(db)
      for (const ws of workspaces) {
        console.log('---UPGRADING----', ws.workspace)
        await upgradeWorkspace(db, ws.workspace)
      }
    })
  })

program
  .command('drop-workspace <name>')
  .description('drop workspace')
  .action(async (workspace, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      const ws = await getWorkspace(db, workspace)
      if (ws === null) {
        console.log('no workspace exists')
        return
      }
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

      console.log('latest model version:', JSON.stringify(version))
    })
  })

program
  .command('show-accounts')
  .description('Show accounts')
  .action(async () => {
    return await withDatabase(mongodbUri, async (db) => {
      const accountsJSON = JSON.stringify(await listAccounts(db), null, 2)
      console.info(accountsJSON)
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
  .command('backup <dirName> <workspace>')
  .description('dump workspace transactions and minio resources')
  .action(async (dirName, workspace, cmd) => {
    const storage = await createFileBackupStorage(dirName)
    return await backup(transactorUrl, workspace, storage)
  })

program
  .command('backup-restore <dirName> <workspace> [date]')
  .description('dump workspace transactions and minio resources')
  .action(async (dirName, workspace, date, cmd) => {
    const storage = await createFileBackupStorage(dirName)
    return await restore(transactorUrl, workspace, storage, parseInt(date ?? '-1'))
  })

program
  .command('backup-list <dirName>')
  .description('list snaphost ids for backup')
  .action(async (dirName, cmd) => {
    const storage = await createFileBackupStorage(dirName)
    return await backupList(storage)
  })

program
  .command('backup-s3 <bucketName> <dirName> <workspace>')
  .description('dump workspace transactions and minio resources')
  .action(async (bucketName, dirName, workspace, cmd) => {
    const storage = await createMinioBackupStorage(minio, bucketName, dirName)
    return await backup(transactorUrl, workspace, storage)
  })
program
  .command('backup-s3-restore <bucketName>, <dirName> <workspace> [date]')
  .description('dump workspace transactions and minio resources')
  .action(async (bucketName, dirName, workspace, date, cmd) => {
    const storage = await createMinioBackupStorage(minio, bucketName, dirName)
    return await restore(transactorUrl, workspace, storage, parseInt(date ?? '-1'))
  })
program
  .command('backup-s3-list <bucketName> <dirName>')
  .description('list snaphost ids for backup')
  .action(async (bucketName, dirName, cmd) => {
    const storage = await createMinioBackupStorage(minio, bucketName, dirName)
    return await backupList(storage)
  })

program
  .command('restore-workspace <workspace> <dirName>')
  .description('restore workspace transactions and minio resources from previous dump.')
  .action(async (workspace, dirName, cmd) => {
    return await restoreWorkspace(mongodbUri, workspace, dirName, minio, elasticUrl, transactorUrl)
  })

program
  .command('diff-workspace <workspace>')
  .description('restore workspace transactions and minio resources from previous dump.')
  .action(async (workspace, cmd) => {
    return await diffWorkspace(mongodbUri, workspace)
  })

program
  .command('clear-telegram-history <workspace>')
  .description('clear telegram history')
  .option('-w, --workspace <workspace>', 'target workspace')
  .action(async (workspace: string, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      const telegramDB = process.env.TELEGRAM_DATABASE
      if (telegramDB === undefined) {
        console.error('please provide TELEGRAM_DATABASE.')
        process.exit(1)
      }

      console.log(`clearing ${workspace} history:`)
      await clearTelegramHistory(mongodbUri, workspace, telegramDB, minio)
    })
  })

program
  .command('clear-telegram-all-history')
  .description('clear telegram history')
  .action(async (cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      const telegramDB = process.env.TELEGRAM_DATABASE
      if (telegramDB === undefined) {
        console.error('please provide TELEGRAM_DATABASE.')
        process.exit(1)
      }

      const workspaces = await listWorkspaces(db)

      for (const w of workspaces) {
        console.log(`clearing ${w.workspace} history:`)
        await clearTelegramHistory(mongodbUri, w.workspace, telegramDB, minio)
      }
    })
  })

program
  .command('rebuild-elastic [workspace]')
  .description('rebuild elastic index')
  .action(async (workspace, cmd) => {
    return await withDatabase(mongodbUri, async (db) => {
      if (workspace === undefined) {
        const workspaces = await listWorkspaces(db)

        for (const w of workspaces) {
          await rebuildElastic(mongodbUri, w.workspace, minio, elasticUrl)
        }
      } else {
        await rebuildElastic(mongodbUri, workspace, minio, elasticUrl)
        console.log('rebuild end')
      }
    })
  })

program
  .command('import-xml <workspace> <fileName>')
  .description('dump workspace transactions and minio resources')
  .action(async (workspace, fileName, cmd) => {
    return await importXml(transactorUrl, workspace, minio, fileName, mongodbUri, elasticUrl)
  })

program
  .command('generate-token <name> <workspace>')
  .description('generate token')
  .action(async (name, workspace) => {
    console.log(generateToken(name, workspace))
  })
program
  .command('decode-token <token>')
  .description('decode token')
  .action(async (token) => {
    console.log(decodeToken(token))
  })
program
  .command('update-recruit <workspace>')
  .description('process pdf documents inside minio and update resumes with skills, etc.')
  .action(async (workspace) => {
    const rekoniUrl = process.env.REKONI_URL
    if (rekoniUrl === undefined) {
      console.log('Please provide REKONI_URL environment variable')
      exit(1)
    }
    return await updateCandidates(transactorUrl, workspace, minio, mongodbUri, elasticUrl, rekoniUrl)
  })

program.parse(process.argv)
