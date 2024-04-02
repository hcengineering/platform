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
  getWorkspaceById,
  listAccounts,
  listWorkspaces,
  listWorkspacesPure,
  listWorkspacesRaw,
  replacePassword,
  setAccountAdmin,
  setRole,
  updateWorkspace,
  upgradeWorkspace,
  type Workspace,
  type WorkspaceInfo
} from '@hcengineering/account'
import { setMetadata } from '@hcengineering/platform'
import {
  backup,
  backupList,
  createFileBackupStorage,
  createStorageBackupStorage,
  restore
} from '@hcengineering/server-backup'
import serverToken, { decodeToken, generateToken } from '@hcengineering/server-token'
import toolPlugin, { FileModelLogger } from '@hcengineering/server-tool'

import { program, type Command } from 'commander'
import { MongoClient, type Db } from 'mongodb'
import { clearTelegramHistory } from './telegram'
import { diffWorkspace, updateField } from './workspace'

import {
  getWorkspaceId,
  MeasureMetricsContext,
  RateLimiter,
  type AccountRole,
  type Data,
  type Tx,
  type Version
} from '@hcengineering/core'
import { consoleModelLogger, type MigrateOperation } from '@hcengineering/model'
import { openAIConfigDefaults } from '@hcengineering/openai'
import { type StorageAdapter } from '@hcengineering/server-core'
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
import { checkOrphanWorkspaces } from './cleanOrphan'
import { changeConfiguration } from './configuration'
import { fixMixinForeignAttributes, showMixinForeignAttributes } from './mixin'
import { openAIConfig } from './openai'
import { fixAccountEmails, renameAccount } from './renameAccount'

/**
 * @public
 */
export function devTool (
  prepareTools: () => {
    mongodbUri: string
    storageAdapter: StorageAdapter
    txes: Tx[]
    version: Data<Version>
    migrateOperations: [string, MigrateOperation][]
  },
  productId: string,
  extendProgram?: (prog: Command) => void
): void {
  const toolCtx = new MeasureMetricsContext('tool', {})
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
        await createAcc(toolCtx, db, productId, email, cmd.password, cmd.first, cmd.last, true)
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
    .command('reset-email <email> <newEmail>')
    .description('rename account in accounts and all workspaces')
    .action(async (email: string, newEmail: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`update account ${email} to ${newEmail}`)
        await renameAccount(toolCtx, db, productId, transactorUrl, email, newEmail)
      })
    })

  program
    .command('fix-email <email> <newEmail>')
    .description('fix email in all workspaces to be proper one')
    .action(async (email: string, newEmail: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`update account ${email} to ${newEmail}`)
        await fixAccountEmails(toolCtx, db, productId, transactorUrl, email, newEmail)
      })
    })

  program
    .command('assign-workspace <email> <workspace>')
    .description('assign workspace')
    .action(async (email: string, workspace: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        console.log(`assigning user ${email} to ${workspace}...`)
        const workspaceInfo = await getWorkspaceById(db, productId, workspace)
        if (workspaceInfo === null) {
          throw new Error(`workspace ${workspace} not found`)
        }
        console.log('assigning to workspace', workspaceInfo)
        try {
          await assignWorkspace(toolCtx, db, productId, email, workspaceInfo.workspace)
        } catch (err: any) {
          console.error(err)
        }
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
    .requiredOption('-w, --workspaceName <workspaceName>', 'Workspace name')
    .option('-e, --email <email>', 'Author email', 'platform@email.com')
    .action(async (workspace, cmd) => {
      const { mongodbUri, txes, version, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const { client } = await createWorkspace(
          toolCtx,
          version,
          txes,
          migrateOperations,
          db,
          productId,
          cmd.email,
          cmd.workspaceName,
          workspace
        )
        await client?.close()
      })
    })

  program
    .command('set-user-role <email> <workspace> <role>')
    .description('set user role')
    .action(async (email: string, workspace: string, role: AccountRole, cmd) => {
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
        const info = await getWorkspaceById(db, productId, workspace)
        if (info === null) {
          throw new Error(`workspace ${workspace} not found`)
        }
        await upgradeWorkspace(version, txes, migrateOperations, productId, db, info.workspaceUrl ?? info.workspace)
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
        const workspaces = await listWorkspacesRaw(db, productId)

        // We need to update workspaces with missing workspaceUrl
        for (const ws of workspaces) {
          if (ws.workspaceUrl == null) {
            const upd: Partial<Workspace> = {
              workspaceUrl: ws.workspace
            }
            if (ws.workspaceName == null) {
              upd.workspaceName = ws.workspace
            }
            await updateWorkspace(db, productId, ws, upd)
          }
        }

        const withError: string[] = []
        let toProcess = workspaces.length
        const st = Date.now()

        async function _upgradeWorkspace (ws: WorkspaceInfo): Promise<void> {
          if (ws.disabled === true) {
            return
          }
          const t = Date.now()
          const logger = cmd.console
            ? consoleModelLogger
            : new FileModelLogger(path.join(cmd.logs, `${ws.workspace}.log`))

          const avgTime = (Date.now() - st) / (workspaces.length - toProcess + 1)
          console.log(
            '---UPGRADING----',
            ws.workspace,
            !cmd.console ? (logger as FileModelLogger).file : '',
            'pending: ',
            toProcess,
            'ETA:',
            avgTime * toProcess
          )
          toProcess--
          try {
            await upgradeWorkspace(
              version,
              txes,
              migrateOperations,
              productId,
              db,
              ws.workspaceUrl ?? ws.workspace,
              logger,
              cmd.force
            )
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
          const rateLimit = new RateLimiter(parallel)
          console.log('parallel upgrade', parallel, cmd.parallel)
          await Promise.all(
            workspaces.map((it) =>
              rateLimit.add(() => {
                return _upgradeWorkspace(it)
              })
            )
          )
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
    .command('remove-unused-workspaces')
    .description(
      'remove unused workspaces, please pass --remove to really delete them. Without it will only mark them disabled'
    )
    .option('-r|--remove [remove]', 'Force remove', false)
    .option('-d|--disable [disable]', 'Force disable', false)
    .option('-e|--exclude [exclude]', 'A comma separated list of workspaces to exclude', '')
    .action(async (cmd: { remove: boolean, disable: boolean, exclude: string }) => {
      const { mongodbUri, storageAdapter } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        const workspaces = await listWorkspacesPure(db, productId)

        // We need to update workspaces with missing workspaceUrl
        await checkOrphanWorkspaces(
          toolCtx,
          workspaces,
          transactorUrl,
          productId,
          cmd,
          db,
          client,
          storageAdapter,
          cmd.exclude.split(',')
        )
      })
    })

  program
    .command('drop-workspace <name>')
    .description('drop workspace')
    .action(async (workspace, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const ws = await getWorkspaceById(db, productId, workspace)
        if (ws === null) {
          console.log('no workspace exists')
          return
        }
        await dropWorkspace(toolCtx, db, productId, workspace)
      })
    })

  program
    .command('list-workspaces')
    .description('List workspaces')
    .action(async () => {
      const { mongodbUri, version } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const workspacesJSON = JSON.stringify(await listWorkspaces(toolCtx, db, productId), null, 2)
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
        const workspaces = await listWorkspacesPure(db, productId)
        const accounts = await listAccounts(db)
        for (const a of accounts) {
          const wss = a.workspaces.map((it) => it.toString())
          console.info(
            a.email,
            a.confirmed,
            workspaces.filter((it) => wss.includes(it._id.toString())).map((it) => it.workspaceUrl ?? it.workspace)
          )
        }
      })
    })

  program
    .command('drop-account <name>')
    .description('drop account')
    .action(async (email: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await dropAccount(toolCtx, db, productId, email)
      })
    })

  program
    .command('backup <dirName> <workspace>')
    .description('dump workspace transactions and minio resources')
    .option('-s, --skip <skip>', 'A list of ; separated domain names to skip during backup', '')
    .option('-f, --force', 'Force backup', false)
    .action(async (dirName: string, workspace: string, cmd: { skip: string, force: boolean }) => {
      const storage = await createFileBackupStorage(dirName)
      await backup(
        transactorUrl,
        getWorkspaceId(workspace, productId),
        storage,
        (cmd.skip ?? '').split(';').map((it) => it.trim()),
        cmd.force
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
      const { storageAdapter } = prepareTools()
      const storage = await createStorageBackupStorage(
        toolCtx,
        storageAdapter,
        getWorkspaceId(bucketName, productId),
        dirName
      )
      await backup(transactorUrl, getWorkspaceId(workspace, productId), storage)
    })
  program
    .command('backup-s3-restore <bucketName> <dirName> <workspace> [date]')
    .description('dump workspace transactions and minio resources')
    .action(async (bucketName: string, dirName: string, workspace: string, date, cmd) => {
      const { storageAdapter } = prepareTools()
      const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
      await restore(transactorUrl, getWorkspaceId(workspace, productId), storage, parseInt(date ?? '-1'))
    })
  program
    .command('backup-s3-list <bucketName> <dirName>')
    .description('list snaphost ids for backup')
    .action(async (bucketName: string, dirName: string, cmd) => {
      const { storageAdapter } = prepareTools()

      const storage = await createStorageBackupStorage(
        toolCtx,
        storageAdapter,
        getWorkspaceId(bucketName, productId),
        dirName
      )
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
      const { mongodbUri, storageAdapter: minio } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const telegramDB = process.env.TELEGRAM_DATABASE
        if (telegramDB === undefined) {
          console.error('please provide TELEGRAM_DATABASE.')
          process.exit(1)
        }

        console.log(`clearing ${workspace} history:`)
        await clearTelegramHistory(toolCtx, mongodbUri, getWorkspaceId(workspace, productId), telegramDB, minio)
      })
    })

  program
    .command('clear-telegram-all-history')
    .description('clear telegram history')
    .action(async (cmd) => {
      const { mongodbUri, storageAdapter: minio } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const telegramDB = process.env.TELEGRAM_DATABASE
        if (telegramDB === undefined) {
          console.error('please provide TELEGRAM_DATABASE.')
          process.exit(1)
        }

        const workspaces = await listWorkspaces(toolCtx, db, productId)

        for (const w of workspaces) {
          console.log(`clearing ${w.workspace} history:`)
          await clearTelegramHistory(toolCtx, mongodbUri, getWorkspaceId(w.workspace, productId), telegramDB, minio)
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
      const { mongodbUri, storageAdapter: minio } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await cleanWorkspace(
          toolCtx,
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
    const { storageAdapter: minio } = prepareTools()
    await fixMinioBW(toolCtx, getWorkspaceId(workspace, productId), minio)
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
    .command('configure-all')
    .description('configure all spaces')
    .option('--enable <enable>', 'Enable plugin configuration', '')
    .option('--disable <disable>', 'Disable plugin configuration', '')
    .option('--list', 'List plugin states', false)
    .action(async (cmd: { enable: string, disable: string, list: boolean }) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log('configure all workspaces')
        console.log(JSON.stringify(cmd))
        const workspaces = await listWorkspacesRaw(db, productId)
        for (const ws of workspaces) {
          console.log('configure', ws.workspaceName ?? ws.workspace)
          await changeConfiguration(getWorkspaceId(ws.workspaceUrl ?? ws.workspace, productId), transactorUrl, cmd)
        }
      })
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
    .description('benchmark')
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

  program
    .command('change-field <workspace>')
    .description('change field value for the object')
    .requiredOption('--objectId <objectId>', 'objectId')
    .requiredOption('--objectClass <objectClass>')
    .requiredOption('--attribute <attribute>')
    .requiredOption('--type <type>', 'number | string')
    .requiredOption('--value <value>')
    .requiredOption('--domain <domain>')
    .action(
      async (
        workspace: string,
        cmd: { objectId: string, objectClass: string, type: string, attribute: string, value: string, domain: string }
      ) => {
        const { mongodbUri } = prepareTools()
        await updateField(mongodbUri, getWorkspaceId(workspace, productId), transactorUrl, cmd)
      }
    )

  extendProgram?.(program)

  program.parse(process.argv)
}
