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
  confirmEmail,
  createAcc,
  createWorkspace,
  dropAccount,
  dropWorkspace,
  getAccount,
  getWorkspace,
  listAccounts,
  listWorkspaces,
  replacePassword,
  setAccountAdmin,
  setRole,
  upgradeWorkspace,
  WorkspaceInfoOnly
} from '@hcengineering/account'
import { setMetadata } from '@hcengineering/platform'
import {
  backup,
  backupList,
  createFileBackupStorage,
  createMinioBackupStorage,
  restore
} from '@hcengineering/server-backup'
import serverToken, { decodeToken, generateToken } from '@hcengineering/server-token'
import toolPlugin, { FileModelLogger } from '@hcengineering/server-tool'

import { program } from 'commander'
import { Db, MongoClient } from 'mongodb'
import { clearTelegramHistory } from './telegram'
import { diffWorkspace } from './workspace'

import { Data, getWorkspaceId, RateLimitter, Tx, Version } from '@hcengineering/core'
import { MinioService } from '@hcengineering/minio'
import { consoleModelLogger, MigrateOperation } from '@hcengineering/model'
import { openAIConfigDefaults } from '@hcengineering/openai'
import path from 'path'
import { benchmark } from './benchmark'
import {
  cleanArchivedSpaces,
  cleanRemovedTransactions,
  cleanWorkspace,
  fixCommentDoubleIdCreate,
  fixMinioBW,
  fixSkills,
  optimizeModel
} from './clean'
import { changeConfiguration } from './configuration'
import { fixMixinForeignAttributes, showMixinForeignAttributes } from './mixin'
import { openAIConfig } from './openai'

/**
 * @public
 */
export function devTool (
  prepareTools: () => {
    mongodbUri: string
    minio: MinioService
    txes: Tx[]
    version: Data<Version>
    migrateOperations: [string, MigrateOperation][]
  },
  productId: string
): void {
  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.error('please provide server secret')
    process.exit(1)
  }

  const transactorUrl = process.env.TRANSACTOR_URL
  if (transactorUrl === undefined) {
    console.error('please provide transactor url.')
    process.exit(1)
  }

  function getElasticUrl (): string {
    const elasticUrl = process.env.ELASTIC_URL
    if (elasticUrl === undefined) {
      console.error('please provide elastic url')
      process.exit(1)
    }
    return elasticUrl
  }

  const initWS = process.env.INIT_WORKSPACE
  if (initWS !== undefined) {
    setMetadata(toolPlugin.metadata.InitWorkspace, initWS)
  }

  setMetadata(toolPlugin.metadata.Endpoint, transactorUrl)
  setMetadata(toolPlugin.metadata.Transactor, transactorUrl)
  setMetadata(serverToken.metadata.Secret, serverSecret)

  async function withDatabase (uri: string, f: (db: Db, client: MongoClient) => Promise<any>): Promise<void> {
    console.log(`connecting to database '${uri}'...`)

    const client = await MongoClient.connect(uri)
    await f(client.db(ACCOUNT_DB), client)
    await client.close()
  }

  program.version('0.0.1')

  // create-account john.appleseed@gmail.com --password 123 --workspace workspace --fullname "John Appleseed"
  program
    .command('create-account <email>')
    .description('create user and corresponding account in master database')
    .requiredOption('-p, --password <password>', 'user password')
    .requiredOption('-f, --first <first>', 'first name')
    .requiredOption('-l, --last <last>', 'last name')
    .action(async (email: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`creating account ${cmd.first as string} ${cmd.last as string} (${email})...`)
        await createAcc(db, productId, email, cmd.password, cmd.first, cmd.last, true)
      })
    })

  program
    .command('reset-account <email>')
    .description('create user and corresponding account in master database')
    .option('-p, --password <password>', 'new user password')
    .action(async (email: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`update account ${email} ${cmd.first as string} ${cmd.last as string}...`)
        await replacePassword(db, productId, email, cmd.password)
      })
    })

  program
    .command('assign-workspace <email> <workspace>')
    .description('assign workspace')
    .action(async (email: string, workspace: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        console.log(`assigning user ${email} to ${workspace}...`)
        await assignWorkspace(db, productId, email, workspace)
      })
    })

  program
    .command('openai <workspace>')
    .description('assign workspace')
    .requiredOption('-t, --token <token>', 'OpenAI token')
    .option('-h, --host <host>', 'OpenAI API Host', openAIConfigDefaults.endpoint)
    .option('--enable <value>', 'Enable or disable', true)
    .option('--embeddings <embeddings>', 'Enable or disable embeddings generation', true)
    .option('--tokenLimit <tokenLimit>', 'Acceptable token limit', `${openAIConfigDefaults.tokenLimit}`)
    .action(
      async (
        workspace: string,
        cmd: { token: string, host: string, enable: string, tokenLimit: string, embeddings: string }
      ) => {
        console.log(`enabling OpenAI for workspace ${workspace}...`)
        await openAIConfig(transactorUrl, workspace, productId, {
          token: cmd.token,
          endpoint: cmd.host,
          enabled: cmd.enable === 'true',
          tokenLimit: parseInt(cmd.tokenLimit),
          embeddings: cmd.embeddings === 'true'
        })
      }
    )

  program
    .command('show-user <email>')
    .description('show user')
    .action(async (email) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const info = await getAccount(db, email)
        console.log(info)
      })
    })

  program
    .command('create-workspace <name>')
    .description('create workspace')
    .requiredOption('-o, --organization <organization>', 'organization name')
    .action(async (workspace, cmd) => {
      const { mongodbUri, txes, version, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await createWorkspace(version, txes, migrateOperations, db, productId, workspace, cmd.organization)
      })
    })

  program
    .command('set-user-role <email> <workspace> <role>')
    .description('set user role')
    .action(async (email: string, workspace: string, role: number, cmd) => {
      console.log(`set user ${email} role for ${workspace}...`)
      await setRole(email, workspace, productId, role)
    })

  program
    .command('set-user-admin <email> <role>')
    .description('set user role')
    .action(async (email: string, role: string) => {
      const { mongodbUri } = prepareTools()
      console.log(`set user ${email} admin...`)
      await withDatabase(mongodbUri, async (db) => {
        await setAccountAdmin(db, email, role === 'true')
      })
    })

  program
    .command('upgrade-workspace <name>')
    .description('upgrade workspace')
    .action(async (workspace, cmd) => {
      const { mongodbUri, version, txes, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await upgradeWorkspace(version, txes, migrateOperations, productId, db, workspace)
      })
    })

  program
    .command('upgrade')
    .description('upgrade')
    .option('-p|--parallel <parallel>', 'Parallel upgrade', '0')
    .option('-l|--logs <logs>', 'Default logs folder', './logs')
    .option('-r|--retry <retry>', 'Number of apply retries', '0')
    .option(
      '-c|--console',
      'Display all information into console(default will create logs folder with {workspace}.log files',
      false
    )
    .option('-f|--force [force]', 'Force update', false)
    .action(async (cmd: { parallel: string, logs: string, retry: string, force: boolean, console: boolean }) => {
      const { mongodbUri, version, txes, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const workspaces = await listWorkspaces(db, productId)
        const withError: string[] = []

        async function _upgradeWorkspace (ws: WorkspaceInfoOnly): Promise<void> {
          const t = Date.now()
          const logger = cmd.console
            ? consoleModelLogger
            : new FileModelLogger(path.join(cmd.logs, `${ws.workspace}.log`))
          console.log('---UPGRADING----', ws.workspace, !cmd.console ? (logger as FileModelLogger).file : '')
          try {
            await upgradeWorkspace(version, txes, migrateOperations, productId, db, ws.workspace, logger, cmd.force)
            console.log('---UPGRADING-DONE----', ws.workspace, Date.now() - t)
          } catch (err: any) {
            withError.push(ws.workspace)
            logger.log('error', JSON.stringify(err))
            console.log('---UPGRADING-FAILED----', ws.workspace, Date.now() - t)
          } finally {
            if (!cmd.console) {
              ;(logger as FileModelLogger).close()
            }
          }
        }
        if (cmd.parallel !== '0') {
          const parallel = parseInt(cmd.parallel) ?? 1
          const rateLimit = new RateLimitter(() => ({ rate: parallel }))
          console.log('parallel upgrade', parallel, cmd.parallel)
          for (const ws of workspaces) {
            await rateLimit.exec(() => {
              return _upgradeWorkspace(ws)
            })
          }
        } else {
          console.log('UPGRADE write logs at:', cmd.logs)
          for (const ws of workspaces) {
            await _upgradeWorkspace(ws)
          }
          if (withError.length > 0) {
            console.log('Failed workspaces', withError)
          }
        }
      })
    })

  program
    .command('drop-workspace <name>')
    .description('drop workspace')
    .action(async (workspace, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const ws = await getWorkspace(db, productId, workspace)
        if (ws === null) {
          console.log('no workspace exists')
          return
        }
        await dropWorkspace(db, productId, workspace)
      })
    })

  program
    .command('list-workspaces')
    .description('List workspaces')
    .action(async () => {
      const { mongodbUri, version } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const workspacesJSON = JSON.stringify(await listWorkspaces(db, productId), null, 2)
        console.info(workspacesJSON)

        console.log('latest model version:', JSON.stringify(version))
      })
    })

  program
    .command('show-accounts')
    .description('Show accounts')
    .action(async () => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const accountsJSON = JSON.stringify(await listAccounts(db), null, 2)
        console.info(accountsJSON)
      })
    })

  program
    .command('drop-account <name>')
    .description('drop account')
    .action(async (email: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await dropAccount(db, productId, email)
      })
    })

  program
    .command('backup <dirName> <workspace>')
    .description('dump workspace transactions and minio resources')
    .option('-s, --skip <skip>', 'A list of ; separated domain names to skip during backup', '')
    .action(async (dirName: string, workspace: string, cmd: { skip: string }) => {
      const storage = await createFileBackupStorage(dirName)
      await backup(
        transactorUrl,
        getWorkspaceId(workspace, productId),
        storage,
        (cmd.skip ?? '').split(';').map((it) => it.trim())
      )
    })

  program
    .command('backup-restore <dirName> <workspace> [date]')
    .option('-m, --merge', 'Enable merge of remote and backup content.', false)
    .description('dump workspace transactions and minio resources')
    .action(async (dirName: string, workspace: string, date, cmd: { merge: boolean }) => {
      const storage = await createFileBackupStorage(dirName)
      await restore(transactorUrl, getWorkspaceId(workspace, productId), storage, parseInt(date ?? '-1'), cmd.merge)
    })

  program
    .command('backup-list <dirName>')
    .description('list snaphost ids for backup')
    .action(async (dirName: string, cmd) => {
      const storage = await createFileBackupStorage(dirName)
      await backupList(storage)
    })

  program
    .command('backup-s3 <bucketName> <dirName> <workspace>')
    .description('dump workspace transactions and minio resources')
    .action(async (bucketName: string, dirName: string, workspace: string, cmd) => {
      const { minio } = prepareTools()
      const wsId = getWorkspaceId(workspace, productId)
      const storage = await createMinioBackupStorage(minio, wsId, dirName)
      await backup(transactorUrl, wsId, storage)
    })
  program
    .command('backup-s3-restore <bucketName>, <dirName> <workspace> [date]')
    .description('dump workspace transactions and minio resources')
    .action(async (bucketName: string, dirName: string, workspace: string, date, cmd) => {
      const { minio } = prepareTools()
      const wsId = getWorkspaceId(bucketName, productId)
      const storage = await createMinioBackupStorage(minio, wsId, dirName)
      await restore(transactorUrl, wsId, storage, parseInt(date ?? '-1'))
    })
  program
    .command('backup-s3-list <bucketName> <dirName>')
    .description('list snaphost ids for backup')
    .action(async (bucketName: string, dirName: string, cmd) => {
      const { minio } = prepareTools()
      const wsId = getWorkspaceId(bucketName, productId)
      const storage = await createMinioBackupStorage(minio, wsId, dirName)
      await backupList(storage)
    })

  program
    .command('confirm-email <email>')
    .description('confirm user email')
    .action(async (email: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const account = await getAccount(db, email)
        if (account?.confirmed === true) {
          console.log(`Already confirmed:${email}`)
        } else {
          await confirmEmail(db, email)
        }
      })
    })

  program
    .command('diff-workspace <workspace>')
    .description('restore workspace transactions and minio resources from previous dump.')
    .action(async (workspace: string, cmd) => {
      const { mongodbUri, txes } = prepareTools()
      await diffWorkspace(mongodbUri, getWorkspaceId(workspace, productId), txes)
    })

  program
    .command('clear-telegram-history <workspace>')
    .description('clear telegram history')
    .option('-w, --workspace <workspace>', 'target workspace')
    .action(async (workspace: string, cmd) => {
      const { mongodbUri, minio } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const telegramDB = process.env.TELEGRAM_DATABASE
        if (telegramDB === undefined) {
          console.error('please provide TELEGRAM_DATABASE.')
          process.exit(1)
        }

        console.log(`clearing ${workspace} history:`)
        await clearTelegramHistory(mongodbUri, getWorkspaceId(workspace, productId), telegramDB, minio)
      })
    })

  program
    .command('clear-telegram-all-history')
    .description('clear telegram history')
    .action(async (cmd) => {
      const { mongodbUri, minio } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const telegramDB = process.env.TELEGRAM_DATABASE
        if (telegramDB === undefined) {
          console.error('please provide TELEGRAM_DATABASE.')
          process.exit(1)
        }

        const workspaces = await listWorkspaces(db, productId)

        for (const w of workspaces) {
          console.log(`clearing ${w.workspace} history:`)
          await clearTelegramHistory(mongodbUri, getWorkspaceId(w.workspace, productId), telegramDB, minio)
        }
      })
    })

  program
    .command('generate-token <name> <workspace> <productId>')
    .description('generate token')
    .action(async (name: string, workspace: string, productId) => {
      console.log(generateToken(name, getWorkspaceId(workspace, productId)))
    })
  program
    .command('decode-token <token>')
    .description('decode token')
    .action(async (token) => {
      console.log(decodeToken(token))
    })

  program
    .command('clean-workspace <workspace>')
    .description('clean workspace')
    .option('--recruit', 'Clean recruit', false)
    .option('--tracker', 'Clean tracker', false)
    .option('--removedTx', 'Clean removed transactions', false)
    .action(async (workspace: string, cmd: { recruit: boolean, tracker: boolean, removedTx: boolean }) => {
      const { mongodbUri, minio } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await cleanWorkspace(
          mongodbUri,
          getWorkspaceId(workspace, productId),
          minio,
          getElasticUrl(),
          transactorUrl,
          cmd
        )
      })
    })

  program.command('fix-bw-workspace <workspace>').action(async (workspace: string) => {
    const { minio } = prepareTools()
    await fixMinioBW(getWorkspaceId(workspace, productId), minio)
  })

  program
    .command('clean-removed-transactions <workspace>')
    .description('clean removed transactions')
    .action(async (workspace: string, cmd: any) => {
      await cleanRemovedTransactions(getWorkspaceId(workspace, productId), transactorUrl)
    })

  program
    .command('clean-archived-spaces <workspace>')
    .description('clean archived spaces')
    .action(async (workspace: string, cmd: any) => {
      await cleanArchivedSpaces(getWorkspaceId(workspace, productId), transactorUrl)
    })

  program
    .command('chunter-fix-comments <workspace>')
    .description('chunter-fix-comments')
    .action(async (workspace: string, cmd: any) => {
      await fixCommentDoubleIdCreate(getWorkspaceId(workspace, productId), transactorUrl)
    })

  program
    .command('mixin-show-foreign-attributes <workspace>')
    .description('mixin-show-foreign-attributes')
    .option('--mixin <mixin>', 'Mixin class', '')
    .option('--property <property>', 'Property name', '')
    .option('--detail <detail>', 'Show details', false)
    .action(async (workspace: string, cmd: { detail: boolean, mixin: string, property: string }) => {
      await showMixinForeignAttributes(getWorkspaceId(workspace, productId), transactorUrl, cmd)
    })

  program
    .command('mixin-fix-foreign-attributes <workspace>')
    .description('mixin-fix-foreign-attributes')
    .option('--mixin <mixin>', 'Mixin class', '')
    .option('--property <property>', 'Property name', '')
    .action(async (workspace: string, cmd: { mixin: string, property: string }) => {
      const { mongodbUri } = prepareTools()
      await fixMixinForeignAttributes(mongodbUri, getWorkspaceId(workspace, productId), transactorUrl, cmd)
    })

  program
    .command('configure <workspace>')
    .description('clean archived spaces')
    .option('--enable <enable>', 'Enable plugin configuration', '')
    .option('--disable <disable>', 'Disable plugin configuration', '')
    .option('--list', 'List plugin states', false)
    .action(async (workspace: string, cmd: { enable: string, disable: string, list: boolean }) => {
      console.log(JSON.stringify(cmd))
      await changeConfiguration(getWorkspaceId(workspace, productId), transactorUrl, cmd)
    })

  program
    .command('optimize-model <workspace>')
    .description('optimize model')
    .action(async (workspace: string, cmd: { enable: string, disable: string, list: boolean }) => {
      console.log(JSON.stringify(cmd))
      await optimizeModel(getWorkspaceId(workspace, productId), transactorUrl)
    })

  program
    .command('benchmark')
    .description('clean archived spaces')
    .option('--from <from>', 'Min client count', '10')
    .option('--steps <steps>', 'Step with client count', '10')
    .option('--sleep <sleep>', 'Random Delay max between operations', '0')
    .option('--binary <binary>', 'Use binary data transfer', false)
    .option('--compression <compression>', 'Use protocol compression', false)
    .option('--write <write>', 'Perform write operations', false)
    .option('--workspaces <workspaces>', 'Workspaces to test on, comma separated', '')
    .action(
      async (cmd: {
        from: string
        steps: string
        sleep: string
        workspaces: string
        binary: string
        compression: string
        write: string
      }) => {
        console.log(JSON.stringify(cmd))
        await benchmark(
          cmd.workspaces.split(',').map((it) => getWorkspaceId(it, productId)),
          transactorUrl,
          {
            steps: parseInt(cmd.steps),
            from: parseInt(cmd.from),
            sleep: parseInt(cmd.sleep),
            binary: cmd.binary === 'true',
            compression: cmd.compression === 'true',
            write: cmd.write === 'true'
          }
        )
      }
    )

  program
    .command('fix-skills <workspace> <step>')
    .description('fix skills for workspace')
    .action(async (workspace: string, step: string) => {
      const { mongodbUri } = prepareTools()
      await fixSkills(mongodbUri, getWorkspaceId(workspace, productId), transactorUrl, step)
    })

  program.parse(process.argv)
}
