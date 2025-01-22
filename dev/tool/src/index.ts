//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2024 Hardcore Engineering Inc.
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

import accountPlugin, {
  assignAccountToWs,
  confirmEmail,
  createAcc,
  createWorkspace as createWorkspaceRecord,
  dropAccount,
  dropWorkspace,
  dropWorkspaceFull,
  getAccount,
  getAccountDB,
  getWorkspaceById,
  listAccounts,
  listWorkspacesByAccount,
  listWorkspacesPure,
  listWorkspacesRaw,
  replacePassword,
  setAccountAdmin,
  setRole,
  updateArchiveInfo,
  updateWorkspace,
  type AccountDB,
  type Workspace
} from '@hcengineering/account'
import { backupWorkspace } from '@hcengineering/backup-service'
import { setMetadata } from '@hcengineering/platform'
import {
  backup,
  backupFind,
  backupList,
  backupRemoveLast,
  backupSize,
  checkBackupIntegrity,
  compactBackup,
  createFileBackupStorage,
  createStorageBackupStorage,
  restore
} from '@hcengineering/server-backup'
import serverClientPlugin, {
  BlobClient,
  createClient,
  getTransactorEndpoint,
  listAccountWorkspaces,
  updateBackupInfo
} from '@hcengineering/server-client'
import {
  createBackupPipeline,
  getConfig,
  getWorkspaceDestroyAdapter,
  registerAdapterFactory,
  registerDestroyFactory,
  registerServerPlugins,
  registerStringLoaders,
  registerTxAdapterFactory
} from '@hcengineering/server-pipeline'
import serverToken, { decodeToken, generateToken } from '@hcengineering/server-token'
import { FileModelLogger, buildModel } from '@hcengineering/server-tool'
import { createWorkspace, upgradeWorkspace } from '@hcengineering/workspace-service'
import path from 'path'

import { buildStorageFromConfig, createStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { program, type Command } from 'commander'
import { addControlledDocumentRank } from './qms'
import { clearTelegramHistory } from './telegram'
import { diffWorkspace, recreateElastic, updateField } from './workspace'

import core, {
  AccountRole,
  generateId,
  getWorkspaceId,
  isActiveMode,
  isArchivingMode,
  MeasureMetricsContext,
  metricsToString,
  RateLimiter,
  systemAccountEmail,
  versionToString,
  type Data,
  type Doc,
  type Ref,
  type Tx,
  type Version,
  type WorkspaceId
} from '@hcengineering/core'
import { consoleModelLogger, type MigrateOperation } from '@hcengineering/model'
import contact from '@hcengineering/model-contact'
import {
  createMongoAdapter,
  createMongoDestroyAdapter,
  createMongoTxAdapter,
  getMongoClient,
  getWorkspaceMongoDB,
  shutdown
} from '@hcengineering/mongo'
import { backupDownload } from '@hcengineering/server-backup/src/backup'

import { createDatalakeClient, CONFIG_KIND as DATALAKE_CONFIG_KIND, type DatalakeConfig } from '@hcengineering/datalake'
import { getModelVersion } from '@hcengineering/model-all'
import { CONFIG_KIND as S3_CONFIG_KIND, S3Service, type S3Config } from '@hcengineering/s3'
import type { PipelineFactory, StorageAdapter, StorageAdapterEx } from '@hcengineering/server-core'
import { deepEqual } from 'fast-equals'
import { createWriteStream, readFileSync } from 'fs'
import { getAccountDBUrl, getMongoDBUrl } from './__start'
import {
  benchmark,
  benchmarkWorker,
  generateWorkspaceData,
  stressBenchmark,
  testFindAll,
  type StressBenchmarkMode
} from './benchmark'
import {
  cleanArchivedSpaces,
  cleanRemovedTransactions,
  cleanWorkspace,
  fixCommentDoubleIdCreate,
  fixMinioBW,
  fixSkills,
  optimizeModel,
  removeDuplicateIds,
  restoreHrTaskTypesFromUpdates,
  restoreRecruitingTaskTypes
} from './clean'
import { changeConfiguration } from './configuration'
import {
  generateUuidMissingWorkspaces,
  updateDataWorkspaceIdToUuid,
  moveAccountDbFromMongoToPG,
  moveFromMongoToPG,
  moveWorkspaceFromMongoToPG
} from './db'
import { restoreControlledDocContentMongo, restoreWikiContentMongo, restoreMarkupRefsMongo } from './markup'
import { fixMixinForeignAttributes, showMixinForeignAttributes } from './mixin'
import { fixAccountEmails, renameAccount, fillGithubUsers } from './account'
import { copyToDatalake, moveFiles, showLostFiles } from './storage'
import { createPostgresTxAdapter, createPostgresAdapter, createPostgreeDestroyAdapter } from '@hcengineering/postgres'

const colorConstants = {
  colorRed: '\u001b[31m',
  colorBlue: '\u001b[34m',
  colorWhiteCyan: '\u001b[37;46m',
  colorRedYellow: '\u001b[31;43m',
  colorPing: '\u001b[38;5;201m',
  colorLavander: '\u001b[38;5;147m',
  colorAqua: '\u001b[38;2;145;231;255m',
  colorPencil: '\u001b[38;2;253;182;0m',
  reset: '\u001b[0m'
}

/**
 * @public
 */
export function devTool (
  prepareTools: () => {
    dbUrl: string
    txes: Tx[]
    version: Data<Version>
    migrateOperations: [string, MigrateOperation][]
  },
  extendProgram?: (prog: Command) => void
): void {
  const toolCtx = new MeasureMetricsContext('tool', {})

  registerTxAdapterFactory('mongodb', createMongoTxAdapter)
  registerAdapterFactory('mongodb', createMongoAdapter)
  registerDestroyFactory('mongodb', createMongoDestroyAdapter)

  registerTxAdapterFactory('postgresql', createPostgresTxAdapter, true)
  registerAdapterFactory('postgresql', createPostgresAdapter, true)
  registerDestroyFactory('postgresql', createPostgreeDestroyAdapter, true)
  registerServerPlugins()
  registerStringLoaders()

  const serverSecret = process.env.SERVER_SECRET
  if (serverSecret === undefined) {
    console.error('please provide server secret')
    process.exit(1)
  }

  const accountsUrl = process.env.ACCOUNTS_URL
  if (accountsUrl === undefined) {
    console.error('please provide accounts url.')
    process.exit(1)
  }

  const transactorUrl = process.env.TRANSACTOR_URL
  if (transactorUrl === undefined) {
    console.error('please provide transactor url.')
  }

  setMetadata(accountPlugin.metadata.Transactors, transactorUrl)
  setMetadata(serverClientPlugin.metadata.Endpoint, accountsUrl)
  setMetadata(serverToken.metadata.Secret, serverSecret)

  async function withAccountDatabase (f: (db: AccountDB) => Promise<any>, dbOverride?: string): Promise<void> {
    const uri = dbOverride ?? getAccountDBUrl()
    console.log(`connecting to database '${uri}'...`)

    const [accountDb, closeAccountsDb] = await getAccountDB(uri)
    try {
      await f(accountDb)
    } catch (err: any) {
      console.error(err)
    }
    closeAccountsDb()
    console.log(`closing database connection to '${uri}'...`)
    await shutdown()
  }

  async function withStorage (f: (storageAdapter: StorageAdapter) => Promise<any>): Promise<void> {
    const adapter = buildStorageFromConfig(storageConfigFromEnv())
    try {
      await f(adapter)
    } catch (err: any) {
      console.error(err)
    }
    await adapter.close()
  }

  program.version('0.0.1')

  program.command('version').action(() => {
    console.log(
      `tools git_version: ${process.env.GIT_REVISION ?? ''} model_version: ${process.env.MODEL_VERSION ?? ''} ${JSON.stringify(getModelVersion())}`
    )
  })

  // create-account john.appleseed@gmail.com --password 123 --workspace workspace --fullname "John Appleseed"
  program
    .command('create-account <email>')
    .description('create user and corresponding account in master database')
    .requiredOption('-p, --password <password>', 'user password')
    .requiredOption('-f, --first <first>', 'first name')
    .requiredOption('-l, --last <last>', 'last name')
    .action(async (email: string, cmd) => {
      await withAccountDatabase(async (db) => {
        console.log(`creating account ${cmd.first as string} ${cmd.last as string} (${email})...`)
        await createAcc(toolCtx, db, null, email, cmd.password, cmd.first, cmd.last, true)
      })
    })

  program
    .command('reset-account <email>')
    .description('create user and corresponding account in master database')
    .option('-p, --password <password>', 'new user password')
    .action(async (email: string, cmd) => {
      await withAccountDatabase(async (db) => {
        console.log(`update account ${email} ${cmd.first as string} ${cmd.last as string}...`)
        await replacePassword(db, email, cmd.password)
      })
    })

  program
    .command('reset-email <email> <newEmail>')
    .description('rename account in accounts and all workspaces')
    .action(async (email: string, newEmail: string, cmd) => {
      await withAccountDatabase(async (db) => {
        console.log(`update account ${email} to ${newEmail}`)
        await renameAccount(toolCtx, db, accountsUrl, email, newEmail)
      })
    })

  program
    .command('fix-email <email> <newEmail>')
    .description('fix email in all workspaces to be proper one')
    .action(async (email: string, newEmail: string, cmd) => {
      await withAccountDatabase(async (db) => {
        console.log(`update account ${email} to ${newEmail}`)
        await fixAccountEmails(toolCtx, db, accountsUrl, email, newEmail)
      })
    })

  program
    .command('compact-db-mongo')
    .description('compact all db collections')
    .option('-w, --workspace <workspace>', 'A selected "workspace" only', '')
    .action(async (cmd: { workspace: string }) => {
      const dbUrl = getMongoDBUrl()
      await withAccountDatabase(async (db) => {
        console.log('compacting db ...')
        let gtotal: number = 0
        const client = getMongoClient(dbUrl)
        const _client = await client.getClient()
        try {
          const workspaces = await listWorkspacesPure(db)
          for (const workspace of workspaces) {
            if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
              continue
            }
            let total: number = 0
            const wsDb = getWorkspaceMongoDB(_client, { name: workspace.workspace })
            const collections = wsDb.listCollections()
            while (true) {
              const collInfo = await collections.next()
              if (collInfo === null) {
                break
              }
              const result = await wsDb.command({ compact: collInfo.name })
              total += result.bytesFreed
            }
            gtotal += total
            console.log('total feed for db', workspace.workspaceName, Math.round(total / (1024 * 1024)))
          }
          console.log('global total feed', Math.round(gtotal / (1024 * 1024)))
        } catch (err: any) {
          console.error(err)
        } finally {
          client.close()
        }
      })
    })

  program
    .command('assign-workspace <email> <workspace>')
    .description('assign workspace')
    .action(async (email: string, workspace: string, cmd) => {
      await withAccountDatabase(async (db) => {
        console.log(`assigning user ${email} to ${workspace}...`)
        try {
          const workspaceInfo = await getWorkspaceById(db, workspace)
          if (workspaceInfo === null) {
            throw new Error(`workspace ${workspace} not found`)
          }
          const token = generateToken(systemAccountEmail, { name: workspaceInfo.workspace })
          const endpoint = await getTransactorEndpoint(token, 'external')
          console.log('assigning to workspace', workspaceInfo, endpoint)
          const client = await createClient(endpoint, token)
          console.log('assigning to workspace connected', workspaceInfo, endpoint)
          await assignAccountToWs(
            toolCtx,
            db,
            null,
            email,
            workspaceInfo.workspace,
            AccountRole.User,
            undefined,
            undefined,
            client
          )
          await client.close()
        } catch (err: any) {
          console.error(err)
        }
      })
    })

  program
    .command('show-user <email>')
    .description('show user')
    .action(async (email) => {
      await withAccountDatabase(async (db) => {
        const info = await getAccount(db, email)
        console.log(info)
      })
    })

  program
    .command('create-workspace <name>')
    .description('create workspace')
    .requiredOption('-w, --workspaceName <workspaceName>', 'Workspace name')
    .option('-e, --email <email>', 'Author email', 'platform@email.com')
    .option('-i, --init <ws>', 'Init from workspace')
    .option('-r, --region <region>', 'Region')
    .option('-b, --branding <key>', 'Branding key')
    .action(
      async (
        workspace,
        cmd: { email: string, workspaceName: string, init?: string, branding?: string, region?: string }
      ) => {
        const { txes, version, migrateOperations } = prepareTools()
        await withAccountDatabase(async (db) => {
          const measureCtx = new MeasureMetricsContext('create-workspace', {})
          const brandingObj =
            cmd.branding !== undefined || cmd.init !== undefined ? { key: cmd.branding, initWorkspace: cmd.init } : null
          const wsInfo = await createWorkspaceRecord(
            measureCtx,
            db,
            brandingObj,
            cmd.email,
            cmd.workspaceName,
            workspace,
            cmd.region,
            'manual-creation'
          )

          await createWorkspace(measureCtx, version, brandingObj, wsInfo, txes, migrateOperations, undefined, true)

          await updateWorkspace(db, wsInfo, {
            mode: 'active',
            progress: 100,
            disabled: false,
            version
          })

          console.log('create-workspace done')
        })
      }
    )

  program
    .command('set-user-role <email> <workspace> <role>')
    .description('set user role')
    .action(async (email: string, workspace: string, role: AccountRole, cmd) => {
      console.log(`set user ${email} role for ${workspace}...`)
      await withAccountDatabase(async (db) => {
        const workspaceInfo = await getWorkspaceById(db, workspace)
        if (workspaceInfo === null) {
          throw new Error(`workspace ${workspace} not found`)
        }
        console.log('assigning to workspace', workspaceInfo)
        const token = generateToken(systemAccountEmail, { name: workspaceInfo.workspace })
        const endpoint = await getTransactorEndpoint(token, 'external')
        const client = await createClient(endpoint, token)
        await setRole(toolCtx, db, email, workspace, role, client)
        await client.close()
      })
    })

  program
    .command('set-user-admin <email> <role>')
    .description('set user role')
    .action(async (email: string, role: string) => {
      console.log(`set user ${email} admin...`)
      await withAccountDatabase(async (db) => {
        await setAccountAdmin(db, email, role === 'true')
      })
    })

  program
    .command('upgrade-workspace <name>')
    .description('upgrade workspace')
    .option('-f|--force [force]', 'Force update', true)
    .option('-i|--indexes [indexes]', 'Force indexes rebuild', false)
    .action(async (workspace, cmd: { force: boolean, indexes: boolean }) => {
      const { version, txes, migrateOperations } = prepareTools()

      await withAccountDatabase(async (db) => {
        const info = await getWorkspaceById(db, workspace)
        if (info === null) {
          throw new Error(`workspace ${workspace} not found`)
        }

        const measureCtx = new MeasureMetricsContext('upgrade-workspace', {})

        await upgradeWorkspace(
          measureCtx,
          version,
          txes,
          migrateOperations,
          info,
          consoleModelLogger,
          async () => {},
          cmd.force,
          cmd.indexes,
          true
        )

        await updateWorkspace(db, info, {
          mode: 'active',
          progress: 100,
          version,
          attempts: 0
        })

        console.log(metricsToString(measureCtx.metrics, 'upgrade', 60))
        console.log('upgrade-workspace done')
      })
    })

  program
    .command('upgrade')
    .description('upgrade')
    .option('-l|--logs <logs>', 'Default logs folder', './logs')
    .option('-i|--ignore [ignore]', 'Ignore workspaces', '')
    .option('-r|--region [region]', 'Region of workspaces', '')
    .option(
      '-c|--console',
      'Display all information into console(default will create logs folder with {workspace}.log files',
      false
    )
    .option('-f|--force [force]', 'Force update', false)
    .action(async (cmd: { logs: string, force: boolean, console: boolean, ignore: string, region: string }) => {
      const { version, txes, migrateOperations } = prepareTools()
      await withAccountDatabase(async (db) => {
        const workspaces = (await listWorkspacesRaw(db, cmd.region)).filter((ws) => !cmd.ignore.includes(ws.workspace))
        workspaces.sort((a, b) => b.lastVisit - a.lastVisit)
        const measureCtx = new MeasureMetricsContext('upgrade', {})

        for (const ws of workspaces) {
          console.warn('UPGRADING', ws.workspaceName)
          const logger = cmd.console
            ? consoleModelLogger
            : new FileModelLogger(path.join(cmd.logs, `${ws.workspace}.log`))

          try {
            await upgradeWorkspace(
              measureCtx,
              version,
              txes,
              migrateOperations,
              ws,
              logger,
              async () => {},
              cmd.force,
              false,
              true
            )

            await updateWorkspace(db, ws, {
              mode: 'active',
              progress: 100,
              version,
              attempts: 0
            })
          } catch (err: any) {
            toolCtx.error('failed to upgrade', { err, workspace: ws.workspace, workspaceName: ws.workspaceName })
            continue
          }
        }
        console.log('upgrade done')
      })
    })

  program
    .command('list-unused-workspaces')
    .description('list unused workspaces. Without it will only mark them disabled')
    .option('-t|--timeout [timeout]', 'Timeout in days', '60')
    .action(async (cmd: { disable: boolean, exclude: string, timeout: string }) => {
      await withAccountDatabase(async (db) => {
        const workspaces = new Map((await listWorkspacesPure(db)).map((p) => [p._id.toString(), p]))

        const accounts = await listAccounts(db)

        const _timeout = parseInt(cmd.timeout) ?? 7

        let used = 0
        let unused = 0

        for (const a of accounts) {
          const authored = a.workspaces
            .map((it) => workspaces.get(it.toString()))
            .filter((it) => it !== undefined && it.createdBy?.trim() === a.email?.trim()) as Workspace[]
          authored.sort((a, b) => b.lastVisit - a.lastVisit)
          if (authored.length > 0) {
            const lastLoginDays = Math.floor((Date.now() - a.lastVisit) / 1000 / 3600 / 24)
            toolCtx.info(a.email, {
              workspaces: a.workspaces.length,
              firstName: a.first,
              lastName: a.last,
              lastLoginDays
            })
            for (const ws of authored) {
              const lastVisitDays = Math.floor((Date.now() - ws.lastVisit) / 1000 / 3600 / 24)

              if (lastVisitDays > _timeout) {
                unused++
                toolCtx.warn('  --- unused', {
                  url: ws.workspaceUrl,
                  id: ws.workspace,
                  lastVisitDays
                })
              } else {
                used++
                toolCtx.warn('  +++ used', {
                  url: ws.workspaceUrl,
                  id: ws.workspace,
                  createdBy: ws.createdBy,
                  lastVisitDays
                })
              }
            }
          }
        }

        console.log('Used: ', used, 'Unused: ', unused)
      })
    })
  program
    .command('archive-workspaces')
    .description('Archive and delete non visited workspaces...')
    .option('-r|--remove [remove]', 'Pass to remove all data', false)
    .option('--region [region]', 'Pass to remove all data', '')
    .option('-t|--timeout [timeout]', 'Timeout in days', '60')
    .option('-w|--workspace [workspace]', 'Force backup of selected workspace', '')
    .action(
      async (cmd: {
        disable: boolean
        exclude: string
        timeout: string
        remove: boolean
        workspace: string
        region: string
      }) => {
        const { dbUrl, txes } = prepareTools()
        await withAccountDatabase(async (db) => {
          const workspaces = (await listWorkspacesPure(db))
            .sort((a, b) => a.lastVisit - b.lastVisit)
            .filter((it) => cmd.workspace === '' || cmd.workspace === it.workspace)

          const _timeout = parseInt(cmd.timeout) ?? 7

          let unused = 0
          for (const ws of workspaces) {
            const lastVisitDays = Math.floor((Date.now() - ws.lastVisit) / 1000 / 3600 / 24)

            if (lastVisitDays > _timeout && isActiveMode(ws.mode)) {
              unused++
              toolCtx.warn('--- unused', {
                url: ws.workspaceUrl,
                id: ws.workspace,
                lastVisitDays,
                mode: ws.mode
              })
              try {
                await backupWorkspace(
                  toolCtx,
                  ws,
                  (dbUrl, storageAdapter) => {
                    const factory: PipelineFactory = createBackupPipeline(toolCtx, dbUrl, txes, {
                      externalStorage: storageAdapter,
                      usePassedCtx: true
                    })
                    return factory
                  },
                  (ctx, dbUrls, workspace, branding, externalStorage) => {
                    return getConfig(ctx, dbUrls, ctx, {
                      externalStorage,
                      disableTriggers: true
                    })
                  },
                  cmd.region,
                  true,
                  true,
                  5000, // 5 gigabytes per blob
                  async (storage, workspaceStorage) => {
                    if (cmd.remove) {
                      await updateArchiveInfo(toolCtx, db, ws.workspace, true)
                      const files = await workspaceStorage.listStream(toolCtx, { name: ws.workspace })

                      while (true) {
                        const docs = await files.next()
                        if (docs.length === 0) {
                          break
                        }
                        await workspaceStorage.remove(
                          toolCtx,
                          { name: ws.workspace },
                          docs.map((it) => it._id)
                        )
                      }

                      const destroyer = getWorkspaceDestroyAdapter(dbUrl)

                      await destroyer.deleteWorkspace(toolCtx, { name: ws.workspace })
                    }
                  }
                )
              } catch (err: any) {
                toolCtx.error('Failed to backup/archive workspace', { workspace: ws.workspace })
              }
            }
          }
          console.log('Processed unused workspaces', unused)
        })
      }
    )

  program
    .command('backup-all')
    .description('Backup all workspaces...')
    .option('--region [region]', 'Force backup of selected workspace', '')
    .option('-w|--workspace [workspace]', 'Force backup of selected workspace', '')
    .action(async (cmd: { workspace: string, region: string }) => {
      const { txes } = prepareTools()
      await withAccountDatabase(async (db) => {
        const workspaces = (await listWorkspacesPure(db))
          .sort((a, b) => a.lastVisit - b.lastVisit)
          .filter((it) => cmd.workspace === '' || cmd.workspace === it.workspace)

        let processed = 0

        // We need to update workspaces with missing workspaceUrl
        for (const ws of workspaces) {
          try {
            if (
              await backupWorkspace(
                toolCtx,
                ws,
                (dbUrl, storageAdapter) => {
                  const factory: PipelineFactory = createBackupPipeline(toolCtx, dbUrl, txes, {
                    externalStorage: storageAdapter,
                    usePassedCtx: true
                  })
                  return factory
                },
                (ctx, dbUrls, workspace, branding, externalStorage) => {
                  return getConfig(ctx, dbUrls, ctx, {
                    externalStorage,
                    disableTriggers: true
                  })
                },
                cmd.region,
                false,
                false,
                100
              )
            ) {
              processed++
            }
          } catch (err: any) {
            toolCtx.error('Failed to backup workspace', { workspace: ws.workspace })
          }
        }
        console.log('Processed workspaces', processed)
      })
    })

  program
    .command('drop-workspace <name>')
    .description('drop workspace')
    .option('--full [full]', 'Force remove all data', false)
    .action(async (workspace, cmd: { full: boolean }) => {
      const { dbUrl } = prepareTools()

      await withStorage(async (storageAdapter) => {
        await withAccountDatabase(async (db) => {
          const ws = await getWorkspaceById(db, workspace)
          if (ws === null) {
            console.log('no workspace exists')
            return
          }
          if (cmd.full) {
            await dropWorkspaceFull(toolCtx, db, dbUrl, null, workspace, storageAdapter)
          } else {
            await dropWorkspace(toolCtx, db, null, workspace)
          }
        })
      })
    })

  program
    .command('drop-workspace-by-email <email>')
    .description('drop workspace')
    .option('--full [full]', 'Force remove all data', false)
    .action(async (email, cmd: { full: boolean }) => {
      const { dbUrl } = prepareTools()
      await withStorage(async (storageAdapter) => {
        await withAccountDatabase(async (db) => {
          for (const workspace of await listWorkspacesByAccount(db, email)) {
            if (cmd.full) {
              await dropWorkspaceFull(toolCtx, db, dbUrl, null, workspace.workspace, storageAdapter)
            } else {
              await dropWorkspace(toolCtx, db, null, workspace.workspace)
            }
          }
        })
      })
    })
  program
    .command('list-workspace-by-email <email>')
    .description('drop workspace')
    .option('--full [full]', 'Force remove all data', false)
    .action(async (email, cmd: { full: boolean }) => {
      await withAccountDatabase(async (db) => {
        for (const workspace of await listWorkspacesByAccount(db, email)) {
          console.log(workspace.workspace, workspace.workspaceUrl, workspace.workspaceName)
        }
      })
    })

  program
    .command('drop-workspace-last-visit')
    .description('drop old workspaces')
    .action(async (cmd: any) => {
      const { dbUrl } = prepareTools()

      await withStorage(async (storageAdapter) => {
        await withAccountDatabase(async (db) => {
          const workspacesJSON = await listWorkspacesPure(db)
          for (const ws of workspacesJSON) {
            const lastVisit = Math.floor((Date.now() - ws.lastVisit) / 1000 / 3600 / 24)
            if (lastVisit > 60) {
              await dropWorkspaceFull(toolCtx, db, dbUrl, null, ws.workspace, storageAdapter)
            }
          }
        })
      })
    })

  program
    .command('list-workspaces')
    .description('List workspaces')
    .option('-e|--expired [expired]', 'Show only expired', false)
    .action(async (cmd: { expired: boolean }) => {
      const { version } = prepareTools()
      await withAccountDatabase(async (db) => {
        const workspacesJSON = await listWorkspacesPure(db)
        for (const ws of workspacesJSON) {
          let lastVisit = Math.floor((Date.now() - ws.lastVisit) / 1000 / 3600 / 24)
          if (cmd.expired && lastVisit <= 7) {
            continue
          }
          console.log(
            colorConstants.colorBlue +
              '####################################################################################################' +
              colorConstants.reset
          )
          console.log('id:', colorConstants.colorWhiteCyan + ws.workspace + colorConstants.reset)
          console.log('url:', ws.workspaceUrl, 'name:', ws.workspaceName)
          console.log(
            'version:',
            ws.version !== undefined ? versionToString(ws.version) : 'not-set',
            !deepEqual(ws.version, version) ? `upgrade to ${versionToString(version)} is required` : ''
          )
          console.log('disabled:', ws.disabled)
          console.log('mode:', ws.mode)
          console.log('created by:', ws.createdBy)
          console.log('members:', (ws.accounts ?? []).length)
          if (Number.isNaN(lastVisit)) {
            lastVisit = 365
          }
          if (lastVisit > 30) {
            console.log(colorConstants.colorRed + `last visit: ${lastVisit} days ago` + colorConstants.reset)
          } else if (lastVisit > 7) {
            console.log(colorConstants.colorRedYellow + `last visit: ${lastVisit} days ago` + colorConstants.reset)
          } else {
            console.log('last visit:', lastVisit, 'days ago')
          }
        }

        console.log('latest model version:', JSON.stringify(version))
      })
    })

  program.command('fix-person-accounts-mongo').action(async () => {
    const { version } = prepareTools()
    const mongodbUri = getMongoDBUrl()
    await withAccountDatabase(async (db) => {
      const ws = await listWorkspacesPure(db)
      const client = getMongoClient(mongodbUri)
      const _client = await client.getClient()
      try {
        for (const w of ws) {
          const wsDb = getWorkspaceMongoDB(_client, { name: w.workspace })
          await wsDb.collection('tx').updateMany(
            {
              objectClass: contact.class.PersonAccount,
              objectSpace: null
            },
            { $set: { objectSpace: core.space.Model } }
          )
        }
      } finally {
        client.close()
      }

      console.log('latest model version:', JSON.stringify(version))
    })
  })

  program
    .command('show-accounts')
    .description('Show accounts')
    .action(async () => {
      await withAccountDatabase(async (db) => {
        const workspaces = await listWorkspacesPure(db)
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
      await withAccountDatabase(async (db) => {
        await dropAccount(toolCtx, db, null, email)
      })
    })

  program
    .command('backup <dirName> <workspace>')
    .description('dump workspace transactions and minio resources')
    .option('-i, --include <include>', 'A list of ; separated domain names to include during backup', '*')
    .option('-s, --skip <skip>', 'A list of ; separated domain names to skip during backup', '')
    .option(
      '-ct, --contentTypes <contentTypes>',
      'A list of ; separated content types for blobs to skip download if size >= limit',
      ''
    )
    .option('-bl, --blobLimit <blobLimit>', 'A blob size limit in megabytes (default 15mb)', '15')
    .option('-f, --force', 'Force backup', false)
    .option('-f, --fresh', 'Force fresh backup', false)
    .option('-c, --clean', 'Force clean of old backup files, only with fresh backup option', false)
    .option('-t, --timeout <timeout>', 'Connect timeout in seconds', '30')
    .action(
      async (
        dirName: string,
        workspace: string,
        cmd: {
          skip: string
          force: boolean
          fresh: boolean
          clean: boolean
          timeout: string
          include: string
          blobLimit: string
          contentTypes: string
        }
      ) => {
        const storage = await createFileBackupStorage(dirName)
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await backup(toolCtx, endpoint, wsid, storage, {
          force: cmd.force,
          freshBackup: cmd.fresh,
          clean: cmd.clean,
          include: cmd.include === '*' ? undefined : new Set(cmd.include.split(';').map((it) => it.trim())),
          skipDomains: (cmd.skip ?? '').split(';').map((it) => it.trim()),
          timeout: 0,
          connectTimeout: parseInt(cmd.timeout) * 1000,
          blobDownloadLimit: parseInt(cmd.blobLimit),
          skipBlobContentTypes: cmd.contentTypes
            .split(';')
            .map((it) => it.trim())
            .filter((it) => it.length > 0)
        })
      }
    )
  program
    .command('backup-find <dirName> <fileId>')
    .description('dump workspace transactions and minio resources')
    .option('-d, --domain <domain>', 'Check only domain')
    .action(async (dirName: string, fileId: string, cmd: { domain: string | undefined }) => {
      const storage = await createFileBackupStorage(dirName)
      await backupFind(storage, fileId as unknown as Ref<Doc>, cmd.domain)
    })

  program
    .command('backup-compact <dirName>')
    .description('Compact a given backup, will create one snapshot clean unused resources')
    .option('-f, --force', 'Force compact.', false)
    .action(async (dirName: string, cmd: { force: boolean }) => {
      const storage = await createFileBackupStorage(dirName)
      await compactBackup(toolCtx, storage, cmd.force)
    })
  program
    .command('backup-check <dirName>')
    .description('Compact a given backup, will create one snapshot clean unused resources')
    .action(async (dirName: string, cmd: any) => {
      const storage = await createFileBackupStorage(dirName)
      await checkBackupIntegrity(toolCtx, storage)
    })

  program
    .command('backup-restore <dirName> <workspace> [date]')
    .option('-m, --merge', 'Enable merge of remote and backup content.', false)
    .option('-p, --parallel <parallel>', 'Enable merge of remote and backup content.', '1')
    .option('-c, --recheck', 'Force hash recheck on server', false)
    .option('-i, --include <include>', 'A list of ; separated domain names to include during backup', '*')
    .option('-s, --skip <skip>', 'A list of ; separated domain names to skip during backup', '')
    .option('--use-storage <useStorage>', 'Use workspace storage adapter from env variable', '')
    .option(
      '--history-file <historyFile>',
      'Store blob send info into file. Will skip already send documents.',
      undefined
    )
    .description('dump workspace transactions and minio resources')
    .action(
      async (
        dirName: string,
        workspace: string,
        date,
        cmd: {
          merge: boolean
          parallel: string
          recheck: boolean
          include: string
          skip: string
          useStorage: string
          historyFile: string
        }
      ) => {
        const storage = await createFileBackupStorage(dirName)
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        const storageConfig = cmd.useStorage !== '' ? storageConfigFromEnv(process.env[cmd.useStorage]) : undefined

        const workspaceStorage: StorageAdapter | undefined =
          storageConfig !== undefined ? buildStorageFromConfig(storageConfig) : undefined
        await restore(toolCtx, endpoint, wsid, storage, {
          date: parseInt(date ?? '-1'),
          merge: cmd.merge,
          parallel: parseInt(cmd.parallel ?? '1'),
          recheck: cmd.recheck,
          include: cmd.include === '*' ? undefined : new Set(cmd.include.split(';')),
          skip: new Set(cmd.skip.split(';')),
          storageAdapter: workspaceStorage,
          historyFile: cmd.historyFile
        })
        await workspaceStorage?.close()
      }
    )

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
      await withStorage(async (adapter) => {
        const storage = await createStorageBackupStorage(toolCtx, adapter, getWorkspaceId(bucketName), dirName)
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await backup(toolCtx, endpoint, wsid, storage)
      })
    })
  program
    .command('backup-s3-clean <bucketName> <days>')
    .description('dump workspace transactions and minio resources')
    .action(async (bucketName: string, days: string, cmd) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])

      const daysInterval = Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
      try {
        const token = generateToken(systemAccountEmail, { name: 'any' })
        const workspaces = (await listAccountWorkspaces(token)).filter((it) => {
          const lastBackup = it.backupInfo?.lastBackup ?? 0
          if (lastBackup > daysInterval) {
            // No backup required, interval not elapsed
            return true
          }

          if (it.lastVisit == null) {
            return false
          }

          return false
        })
        workspaces.sort((a, b) => {
          return (b.backupInfo?.backupSize ?? 0) - (a.backupInfo?.backupSize ?? 0)
        })

        for (const ws of workspaces) {
          const storage = await createStorageBackupStorage(
            toolCtx,
            storageAdapter,
            getWorkspaceId(bucketName),
            ws.workspace
          )
          await backupRemoveLast(storage, daysInterval)
          await updateBackupInfo(generateToken(systemAccountEmail, { name: 'any' }), {
            backups: ws.backupInfo?.backups ?? 0,
            backupSize: ws.backupInfo?.backupSize ?? 0,
            blobsSize: ws.backupInfo?.blobsSize ?? 0,
            dataSize: ws.backupInfo?.dataSize ?? 0,
            lastBackup: daysInterval
          })
        }
      } finally {
        await storageAdapter.close()
      }
    })
  program
    .command('backup-clean <dirName> <days>')
    .description('dump workspace transactions and minio resources')
    .action(async (dirName: string, days: string, cmd) => {
      const daysInterval = Date.now() - parseInt(days) * 24 * 60 * 60 * 1000
      const storage = await createFileBackupStorage(dirName)
      await backupRemoveLast(storage, daysInterval)
    })

  program
    .command('backup-s3-compact <bucketName> <dirName>')
    .description('Compact a given backup to just one snapshot')
    .option('-f, --force', 'Force compact.', false)
    .action(async (bucketName: string, dirName: string, cmd: { force: boolean, print: boolean }) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
      try {
        const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
        await compactBackup(toolCtx, storage, cmd.force)
      } catch (err: any) {
        toolCtx.error('failed to size backup', { err })
      }
      await storageAdapter.close()
    })
  program
    .command('backup-s3-check <bucketName> <dirName>')
    .description('Compact a given backup to just one snapshot')
    .action(async (bucketName: string, dirName: string, cmd: any) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
      try {
        const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
        await checkBackupIntegrity(toolCtx, storage)
      } catch (err: any) {
        toolCtx.error('failed to size backup', { err })
      }
      await storageAdapter.close()
    })

  program
    .command('backup-s3-restore <bucketName> <dirName> <workspace> [date]')
    .description('dump workspace transactions and minio resources')
    .action(async (bucketName: string, dirName: string, workspace: string, date, cmd) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
      try {
        const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await restore(toolCtx, endpoint, wsid, storage, {
          date: parseInt(date ?? '-1')
        })
      } catch (err: any) {
        toolCtx.error('failed to size backup', { err })
      }
      await storageAdapter.close()
    })
  program
    .command('backup-s3-list <bucketName> <dirName>')
    .description('list snaphost ids for backup')
    .action(async (bucketName: string, dirName: string, cmd) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
      try {
        const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
        await backupList(storage)
      } catch (err: any) {
        toolCtx.error('failed to size backup', { err })
      }
      await storageAdapter.close()
    })

  program
    .command('backup-s3-size <bucketName> <dirName>')
    .description('list snaphost ids for backup')
    .action(async (bucketName: string, dirName: string, cmd) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
      try {
        const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
        await backupSize(storage)
      } catch (err: any) {
        toolCtx.error('failed to size backup', { err })
      }
      await storageAdapter.close()
    })

  program
    .command('backup-s3-download <bucketName> <dirName> <storeIn>')
    .description('Download a full backup from s3 to local dir')
    .action(async (bucketName: string, dirName: string, storeIn: string, cmd) => {
      const backupStorageConfig = storageConfigFromEnv(process.env.STORAGE)
      const storageAdapter = createStorageFromConfig(backupStorageConfig.storages[0])
      try {
        const storage = await createStorageBackupStorage(toolCtx, storageAdapter, getWorkspaceId(bucketName), dirName)
        await backupDownload(storage, storeIn)
      } catch (err: any) {
        toolCtx.error('failed to size backup', { err })
      }
      await storageAdapter.close()
    })

  program
    .command('copy-s3-datalake')
    .description('copy files from s3 to datalake')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-c, --concurrency <concurrency>', 'Number of files being processed concurrently', '10')
    .option('-s, --skip <number>', 'Number of workspaces to skip', '0')
    .option('-e, --existing', 'Copy existing blobs', false)
    .action(async (cmd: { workspace: string, concurrency: string, existing: boolean, skip: string }) => {
      const params = {
        concurrency: parseInt(cmd.concurrency),
        existing: cmd.existing
      }
      const skip = parseInt(cmd.skip)

      const storageConfig = storageConfigFromEnv(process.env.STORAGE)

      const storages = storageConfig.storages.filter((p) => p.kind === S3_CONFIG_KIND) as S3Config[]
      if (storages.length === 0) {
        throw new Error('S3 storage config is required')
      }

      const datalakeConfig = storageConfig.storages.find((p) => p.kind === DATALAKE_CONFIG_KIND)
      if (datalakeConfig === undefined) {
        throw new Error('Datalake storage config is required')
      }

      toolCtx.info('using datalake', { datalake: datalakeConfig })
      const datalake = createDatalakeClient(datalakeConfig as DatalakeConfig)

      let workspaces: Workspace[] = []
      await withAccountDatabase(async (db) => {
        workspaces = await listWorkspacesPure(db)
        workspaces = workspaces
          .filter((p) => isActiveMode(p.mode) || isArchivingMode(p.mode))
          .filter((p) => cmd.workspace === '' || p.workspace === cmd.workspace)
          // .sort((a, b) => b.lastVisit - a.lastVisit)
          .sort((a, b) => {
            if (a.backupInfo !== undefined && b.backupInfo !== undefined) {
              return b.backupInfo.blobsSize - a.backupInfo.blobsSize
            } else if (b.backupInfo !== undefined) {
              return 1
            } else if (a.backupInfo !== undefined) {
              return -1
            } else {
              return b.lastVisit - a.lastVisit
            }
          })
      })

      const count = workspaces.length
      console.log('found workspaces', count)

      let index = 0
      for (const workspace of workspaces) {
        index++
        if (index <= skip) {
          toolCtx.info('processing workspace', { workspace: workspace.workspace, index, count })
          continue
        }

        toolCtx.info('processing workspace', {
          workspace: workspace.workspace,
          index,
          count,
          blobsSize: workspace.backupInfo?.blobsSize ?? 0
        })
        const workspaceId = getWorkspaceId(workspace.workspace)

        for (const config of storages) {
          const storage = new S3Service(config)
          await copyToDatalake(toolCtx, workspaceId, config, storage, datalake, params)
        }
      }
    })

  program
    .command('restore-wiki-content-mongo')
    .description('restore wiki document contents')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-d, --dryrun', 'Dry run', false)
    .action(async (cmd: { workspace: string, dryrun: boolean }) => {
      const params = {
        dryRun: cmd.dryrun
      }

      const { version } = prepareTools()

      let workspaces: Workspace[] = []
      await withAccountDatabase(async (db) => {
        workspaces = await listWorkspacesPure(db)
        workspaces = workspaces
          .filter((p) => isActiveMode(p.mode))
          .filter((p) => cmd.workspace === '' || p.workspace === cmd.workspace)
          .sort((a, b) => b.lastVisit - a.lastVisit)
      })

      console.log('found workspaces', workspaces.length)

      await withStorage(async (storageAdapter) => {
        const mongodbUri = getMongoDBUrl()
        const client = getMongoClient(mongodbUri)
        const _client = await client.getClient()

        try {
          const count = workspaces.length
          let index = 0
          for (const workspace of workspaces) {
            index++

            toolCtx.info('processing workspace', { workspace: workspace.workspace, index, count })
            if (workspace.version === undefined || !deepEqual(workspace.version, version)) {
              console.log(`upgrade to ${versionToString(version)} is required`)
              continue
            }

            const workspaceId = getWorkspaceId(workspace.workspace)
            const wsDb = getWorkspaceMongoDB(_client, { name: workspace.workspace })

            await restoreWikiContentMongo(toolCtx, wsDb, workspaceId, storageAdapter, params)
          }
        } finally {
          client.close()
        }
      })
    })

  program
    .command('restore-controlled-content-mongo')
    .description('restore controlled document contents')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-d, --dryrun', 'Dry run', false)
    .option('-f, --force', 'Force update', false)
    .action(async (cmd: { workspace: string, dryrun: boolean, force: boolean }) => {
      const params = {
        dryRun: cmd.dryrun
      }

      const { version } = prepareTools()

      let workspaces: Workspace[] = []
      await withAccountDatabase(async (db) => {
        workspaces = await listWorkspacesPure(db)
        workspaces = workspaces
          .filter((p) => p.mode !== 'archived')
          .filter((p) => cmd.workspace === '' || p.workspace === cmd.workspace)
          .sort((a, b) => b.lastVisit - a.lastVisit)
      })

      console.log('found workspaces', workspaces.length)

      await withStorage(async (storageAdapter) => {
        await withAccountDatabase(async (db) => {
          const mongodbUri = getMongoDBUrl()
          const client = getMongoClient(mongodbUri)
          const _client = await client.getClient()

          try {
            const count = workspaces.length
            let index = 0
            for (const workspace of workspaces) {
              index++

              toolCtx.info('processing workspace', { workspace: workspace.workspace, index, count })

              if (!cmd.force && (workspace.version === undefined || !deepEqual(workspace.version, version))) {
                console.log(`upgrade to ${versionToString(version)} is required`)
                continue
              }

              const workspaceId = getWorkspaceId(workspace.workspace)
              const wsDb = getWorkspaceMongoDB(_client, { name: workspace.workspace })

              await restoreControlledDocContentMongo(toolCtx, wsDb, workspaceId, storageAdapter, params)
            }
          } finally {
            client.close()
          }
        })
      })
    })

  program
    .command('restore-markup-ref-mongo')
    .description('restore markup document content refs')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-f, --force', 'Force update', false)
    .action(async (cmd: { workspace: string, force: boolean }) => {
      const { txes, version } = prepareTools()

      const { hierarchy } = await buildModel(toolCtx, txes)

      let workspaces: Workspace[] = []
      await withAccountDatabase(async (db) => {
        workspaces = await listWorkspacesPure(db)
        workspaces = workspaces
          .filter((p) => isActiveMode(p.mode))
          .filter((p) => cmd.workspace === '' || p.workspace === cmd.workspace)
          .sort((a, b) => b.lastVisit - a.lastVisit)
      })

      console.log('found workspaces', workspaces.length)

      await withStorage(async (storageAdapter) => {
        const mongodbUri = getMongoDBUrl()
        const client = getMongoClient(mongodbUri)
        const _client = await client.getClient()

        try {
          const count = workspaces.length
          let index = 0
          for (const workspace of workspaces) {
            index++

            toolCtx.info('processing workspace', {
              workspace: workspace.workspace,
              version: workspace.version,
              index,
              count
            })

            if (!cmd.force && (workspace.version === undefined || !deepEqual(workspace.version, version))) {
              console.log(`upgrade to ${versionToString(version)} is required`)
              continue
            }

            const workspaceId = getWorkspaceId(workspace.workspace)
            const wsDb = getWorkspaceMongoDB(_client, { name: workspace.workspace })

            await restoreMarkupRefsMongo(toolCtx, wsDb, workspaceId, hierarchy, storageAdapter)
          }
        } finally {
          client.close()
        }
      })
    })

  program
    .command('confirm-email <email>')
    .description('confirm user email')
    .action(async (email: string, cmd) => {
      await withAccountDatabase(async (db) => {
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
      const { dbUrl, txes } = prepareTools()
      await diffWorkspace(dbUrl, getWorkspaceId(workspace), txes)
    })

  program
    .command('clear-telegram-history <workspace>')
    .description('clear telegram history')
    .option('-w, --workspace <workspace>', 'target workspace')
    .action(async (workspace: string, cmd) => {
      const { dbUrl } = prepareTools()
      await withStorage(async (adapter) => {
        const telegramDB = process.env.TELEGRAM_DATABASE
        if (telegramDB === undefined) {
          console.error('please provide TELEGRAM_DATABASE.')
          process.exit(1)
        }

        console.log(`clearing ${workspace} history:`)
        await clearTelegramHistory(toolCtx, dbUrl, getWorkspaceId(workspace), telegramDB, adapter)
      })
    })

  program
    .command('clear-telegram-all-history')
    .description('clear telegram history')
    .action(async (cmd) => {
      const { dbUrl } = prepareTools()
      await withStorage(async (adapter) => {
        await withAccountDatabase(async (db) => {
          const telegramDB = process.env.TELEGRAM_DATABASE
          if (telegramDB === undefined) {
            console.error('please provide TELEGRAM_DATABASE.')
            process.exit(1)
          }

          const workspaces = await listWorkspacesPure(db)

          for (const w of workspaces) {
            console.log(`clearing ${w.workspace} history:`)
            await clearTelegramHistory(toolCtx, dbUrl, getWorkspaceId(w.workspace), telegramDB, adapter)
          }
        })
      })
    })

  program
    .command('generate-token <name> <workspace>')
    .description('generate token')
    .option('--admin', 'Generate token with admin access', false)
    .action(async (name: string, workspace: string, opt: { admin: boolean }) => {
      console.log(generateToken(name, getWorkspaceId(workspace), { ...(opt.admin ? { admin: 'true' } : {}) }))
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
      const { dbUrl } = prepareTools()
      await withStorage(async (adapter) => {
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await cleanWorkspace(toolCtx, dbUrl, wsid, adapter, endpoint, cmd)
      })
    })
  program
    .command('clean-empty-buckets')
    .option('--prefix [prefix]', 'Prefix', '')
    .action(async (cmd: { prefix: string }) => {
      await withStorage(async (adapter) => {
        const buckets = await adapter.listBuckets(toolCtx)
        for (const ws of buckets) {
          if (ws.name.startsWith(cmd.prefix)) {
            console.log('Checking', ws.name)
            const l = await ws.list()
            const docs = await l.next()
            if (docs.length === 0) {
              await l.close()
              // No data, we could delete it.
              console.log('Clean bucket', ws.name)
              await ws.delete()
            } else {
              await l.close()
            }
          }
        }
      })
    })
  program
    .command('upload-file <workspace> <local> <remote> <contentType>')
    .action(async (workspace: string, local: string, remote: string, contentType: string, cmd: any) => {
      const wsId: WorkspaceId = {
        name: workspace
      }
      const token = generateToken(systemAccountEmail, wsId)
      const endpoint = await getTransactorEndpoint(token)
      const blobClient = new BlobClient(endpoint, token, wsId)
      const buffer = readFileSync(local)
      await blobClient.upload(toolCtx, remote, buffer.length, contentType, buffer)
    })

  program
    .command('download-file <workspace> <remote> <local>')
    .action(async (workspace: string, remote: string, local: string, cmd: any) => {
      const wsId: WorkspaceId = {
        name: workspace
      }
      const token = generateToken(systemAccountEmail, wsId)
      const endpoint = await getTransactorEndpoint(token)
      const blobClient = new BlobClient(endpoint, token, wsId)
      const wrstream = createWriteStream(local)
      await blobClient.writeTo(toolCtx, remote, -1, {
        write: (buffer, cb) => {
          wrstream.write(buffer, cb)
        },
        end: (cb) => {
          wrstream.end(cb)
        }
      })
    })

  program
    .command('move-files')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-m, --move <move>', 'When set to true, the files will be moved, otherwise copied', 'false')
    .option('-bl, --blobLimit <blobLimit>', 'A blob size limit in megabytes (default 50mb)', '999999')
    .option('-c, --concurrency <concurrency>', 'Number of files being processed concurrently', '10')
    .option('--disabled', 'Include disabled workspaces', false)
    .action(
      async (cmd: { workspace: string, move: string, blobLimit: string, concurrency: string, disabled: boolean }) => {
        const params = {
          concurrency: parseInt(cmd.concurrency),
          move: cmd.move === 'true'
        }

        await withAccountDatabase(async (db) => {
          await withStorage(async (adapter) => {
            try {
              const exAdapter = adapter as StorageAdapterEx
              if (exAdapter.adapters === undefined || exAdapter.adapters.length < 2) {
                throw new Error('bad storage config, at least two storage providers are required')
              }

              console.log('moving files to storage provider', exAdapter.adapters[0].name)

              let index = 1
              const workspaces = await listWorkspacesPure(db)
              workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

              const rateLimit = new RateLimiter(10)
              for (const workspace of workspaces) {
                if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
                  continue
                }
                if (!isActiveMode(workspace.mode)) {
                  console.log('ignore non active workspace', workspace.workspace, workspace.mode)
                  continue
                }
                if (workspace.disabled === true && !cmd.disabled) {
                  console.log('ignore disabled workspace', workspace.workspace)
                  continue
                }

                await rateLimit.exec(async () => {
                  console.log('start', workspace.workspace, index, '/', workspaces.length)
                  await moveFiles(toolCtx, getWorkspaceId(workspace.workspace), exAdapter, params)
                  console.log('done', workspace.workspace)
                  index += 1
                })
              }
              await rateLimit.waitProcessing()
            } catch (err: any) {
              console.error(err)
            }
          })
        })
      }
    )

  program
    .command('show-lost-files-mongo')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('--disabled', 'Include disabled workspaces', false)
    .option('--all', 'Show all files', false)
    .action(async (cmd: { workspace: string, disabled: boolean, all: boolean }) => {
      await withAccountDatabase(async (db) => {
        await withStorage(async (adapter) => {
          const mongodbUri = getMongoDBUrl()
          const client = getMongoClient(mongodbUri)
          const _client = await client.getClient()
          try {
            let index = 1
            const workspaces = await listWorkspacesPure(db)
            workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

            for (const workspace of workspaces) {
              if (!isActiveMode(workspace.mode)) {
                console.log('ignore non active workspace', workspace.workspace, workspace.mode)
                continue
              }
              if (workspace.disabled === true && !cmd.disabled) {
                console.log('ignore disabled workspace', workspace.workspace)
                continue
              }

              if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
                continue
              }

              try {
                console.log('start', workspace.workspace, index, '/', workspaces.length)
                const workspaceId = getWorkspaceId(workspace.workspace)
                const wsDb = getWorkspaceMongoDB(_client, { name: workspace.workspace })
                await showLostFiles(toolCtx, workspaceId, wsDb, adapter, { showAll: cmd.all })
                console.log('done', workspace.workspace)
              } catch (err) {
                console.error(err)
              }

              index += 1
            }
          } catch (err: any) {
            console.error(err)
          } finally {
            client.close()
          }
        })
      })
    })

  program.command('fix-bw-workspace <workspace>').action(async (workspace: string) => {
    await withStorage(async (adapter) => {
      await fixMinioBW(toolCtx, getWorkspaceId(workspace), adapter)
    })
  })

  program
    .command('clean-removed-transactions <workspace>')
    .description('clean removed transactions')
    .action(async (workspace: string, cmd: any) => {
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await cleanRemovedTransactions(wsid, endpoint)
    })

  program
    .command('clean-archived-spaces <workspace>')
    .description('clean archived spaces')
    .action(async (workspace: string, cmd: any) => {
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await cleanArchivedSpaces(wsid, endpoint)
    })

  program
    .command('chunter-fix-comments <workspace>')
    .description('chunter-fix-comments')
    .action(async (workspace: string, cmd: any) => {
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await fixCommentDoubleIdCreate(wsid, endpoint)
    })

  program
    .command('mixin-show-foreign-attributes <workspace>')
    .description('mixin-show-foreign-attributes')
    .option('--mixin <mixin>', 'Mixin class', '')
    .option('--property <property>', 'Property name', '')
    .option('--detail <detail>', 'Show details', false)
    .action(async (workspace: string, cmd: { detail: boolean, mixin: string, property: string }) => {
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await showMixinForeignAttributes(wsid, endpoint, cmd)
    })

  program
    .command('mixin-fix-foreign-attributes-mongo <workspace>')
    .description('mixin-fix-foreign-attributes')
    .option('--mixin <mixin>', 'Mixin class', '')
    .option('--property <property>', 'Property name', '')
    .action(async (workspace: string, cmd: { mixin: string, property: string }) => {
      const mongodbUri = getMongoDBUrl()
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await fixMixinForeignAttributes(mongodbUri, wsid, endpoint, cmd)
    })

  program
    .command('configure <workspace>')
    .description('clean archived spaces')
    .option('--enable <enable>', 'Enable plugin configuration', '')
    .option('--disable <disable>', 'Disable plugin configuration', '')
    .option('--list', 'List plugin states', false)
    .action(async (workspace: string, cmd: { enable: string, disable: string, list: boolean }) => {
      console.log(JSON.stringify(cmd))
      const wsid = getWorkspaceId(workspace)
      const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
      await changeConfiguration(wsid, endpoint, cmd)
    })

  program
    .command('configure-all')
    .description('configure all spaces')
    .option('--enable <enable>', 'Enable plugin configuration', '')
    .option('--disable <disable>', 'Disable plugin configuration', '')
    .option('--list', 'List plugin states', false)
    .action(async (cmd: { enable: string, disable: string, list: boolean }) => {
      await withAccountDatabase(async (db) => {
        console.log('configure all workspaces')
        console.log(JSON.stringify(cmd))
        const workspaces = await listWorkspacesRaw(db)
        for (const ws of workspaces) {
          console.log('configure', ws.workspaceName ?? ws.workspace)
          const wsid = getWorkspaceId(ws.workspace)
          const token = generateToken(systemAccountEmail, wsid)
          const endpoint = await getTransactorEndpoint(token)
          await changeConfiguration(wsid, endpoint, cmd)
        }
      })
    })

  program
    .command('optimize-model <workspace>')
    .description('optimize model')
    .action(async (workspace: string, cmd: { enable: string, disable: string, list: boolean }) => {
      console.log(JSON.stringify(cmd))
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await optimizeModel(wsid, endpoint)
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
    .option('--mode <mode>', 'A benchmark mode. Supported values: `find-all`, `connect-only` ', 'find-all')
    .action(
      async (cmd: {
        from: string
        steps: string
        sleep: string
        workspaces: string
        binary: string
        compression: string
        write: string
        mode: 'find-all' | 'connect-only'
      }) => {
        await withAccountDatabase(async (db) => {
          console.log(JSON.stringify(cmd))
          if (!['find-all', 'connect-only'].includes(cmd.mode)) {
            console.log('wrong mode')
            return
          }

          const allWorkspacesPure = Array.from(await listWorkspacesPure(db))
          const allWorkspaces = new Map(allWorkspacesPure.map((it) => [it.workspace, it]))

          let workspaces = cmd.workspaces
            .split(',')
            .map((it) => it.trim())
            .filter((it) => it.length > 0)
            .map((it) => getWorkspaceId(it))

          if (cmd.workspaces.length === 0) {
            workspaces = allWorkspacesPure.map((it) => getWorkspaceId(it.workspace))
          }
          const accounts = new Map(Array.from(await listAccounts(db)).map((it) => [it._id.toString(), it.email]))

          const accountWorkspaces = new Map<string, string[]>()
          for (const ws of workspaces) {
            const wsInfo = allWorkspaces.get(ws.name)
            if (wsInfo !== undefined) {
              accountWorkspaces.set(
                ws.name,
                wsInfo.accounts.map((it) => accounts.get(it.toString()) as string)
              )
            }
          }
          await benchmark(workspaces, accountWorkspaces, accountsUrl, {
            steps: parseInt(cmd.steps),
            from: parseInt(cmd.from),
            sleep: parseInt(cmd.sleep),
            binary: cmd.binary === 'true',
            compression: cmd.compression === 'true',
            write: cmd.write === 'true',
            mode: cmd.mode
          })
        })
      }
    )
  program
    .command('benchmarkWorker')
    .description('benchmarkWorker')
    .action(async (cmd: any) => {
      console.log(JSON.stringify(cmd))
      benchmarkWorker()
    })

  program
    .command('stress <transactor>')
    .description('stress benchmark')
    .option('--mode <mode>', 'A benchmark mode. Supported values: `wrong`, `connect-disconnect` ', 'wrong')
    .action(async (transactor: string, cmd: { mode: StressBenchmarkMode }) => {
      await stressBenchmark(transactor, cmd.mode)
    })

  program
    .command('fix-skills-mongo <workspace> <step>')
    .description('fix skills for workspace')
    .action(async (workspace: string, step: string) => {
      const mongodbUri = getMongoDBUrl()
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await fixSkills(mongodbUri, wsid, endpoint, step)
    })

  program
    .command('restore-ats-types-mongo <workspace>')
    .description('Restore recruiting task types for workspace')
    .action(async (workspace: string) => {
      const mongodbUri = getMongoDBUrl()
      console.log('Restoring recruiting task types in workspace ', workspace, '...')
      const wsid = getWorkspaceId(workspace)
      const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
      await restoreRecruitingTaskTypes(mongodbUri, wsid, endpoint)
    })

  program
    .command('restore-ats-types-2-mongo <workspace>')
    .description('Restore recruiting task types for workspace 2')
    .action(async (workspace: string) => {
      const mongodbUri = getMongoDBUrl()
      console.log('Restoring recruiting task types in workspace ', workspace, '...')
      const wsid = getWorkspaceId(workspace)
      const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
      await restoreHrTaskTypesFromUpdates(mongodbUri, wsid, endpoint)
    })

  program
    .command('change-field <workspace>')
    .description('change field value for the object')
    .requiredOption('--objectId <objectId>', 'objectId')
    .requiredOption('--objectClass <objectClass>')
    .requiredOption('--attribute <attribute>')
    .requiredOption('--type <type>', 'number | string')
    .requiredOption('--value <value>')
    .action(
      async (
        workspace: string,
        cmd: { objectId: string, objectClass: string, type: string, attribute: string, value: string, domain: string }
      ) => {
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await updateField(wsid, endpoint, cmd)
      }
    )

  program
    .command('recreate-elastic-indexes-mongo <workspace>')
    .description('reindex workspace to elastic')
    .action(async (workspace: string) => {
      const mongodbUri = getMongoDBUrl()
      const wsid = getWorkspaceId(workspace)
      await recreateElastic(mongodbUri, wsid)
    })

  program
    .command('recreate-all-elastic-indexes-mongo')
    .description('reindex elastic')
    .action(async () => {
      const { dbUrl } = prepareTools()
      const mongodbUri = getMongoDBUrl()

      await withAccountDatabase(async (db) => {
        const workspaces = await listWorkspacesRaw(db)
        workspaces.sort((a, b) => b.lastVisit - a.lastVisit)
        for (const workspace of workspaces) {
          const wsid = getWorkspaceId(workspace.workspace)
          await recreateElastic(mongodbUri ?? dbUrl, wsid)
        }
      })
    })

  program
    .command('remove-duplicates-ids-mongo <workspaces>')
    .description('remove duplicates ids for futue migration')
    .action(async (workspaces: string) => {
      const mongodbUri = getMongoDBUrl()
      await withStorage(async (adapter) => {
        await removeDuplicateIds(toolCtx, mongodbUri, adapter, accountsUrl, workspaces)
      })
    })

  program.command('move-to-pg <region>').action(async (region: string) => {
    const { dbUrl } = prepareTools()
    const mongodbUri = getMongoDBUrl()

    await withAccountDatabase(async (db) => {
      const workspaces = await listWorkspacesRaw(db)
      workspaces.sort((a, b) => b.lastVisit - a.lastVisit)
      await moveFromMongoToPG(
        db,
        mongodbUri,
        dbUrl,
        workspaces.filter((p) => p.region !== region),
        region
      )
    })
  })

  program
    .command('move-workspace-to-pg <workspace> <region>')
    .option('-i, --include <include>', 'A list of ; separated domain names to include during backup', '*')
    .option('-f|--force [force]', 'Force update', false)
    .action(
      async (
        workspace: string,
        region: string,
        cmd: {
          include: string
          force: boolean
        }
      ) => {
        const { dbUrl } = prepareTools()
        const mongodbUri = getMongoDBUrl()

        await withAccountDatabase(async (db) => {
          const workspaceInfo = await getWorkspaceById(db, workspace)
          if (workspaceInfo === null) {
            throw new Error(`workspace ${workspace} not found`)
          }
          if (workspaceInfo.region === region && !cmd.force) {
            throw new Error(`workspace ${workspace} is already migrated`)
          }
          await moveWorkspaceFromMongoToPG(
            db,
            mongodbUri,
            dbUrl,
            workspaceInfo,
            region,
            cmd.include === '*' ? undefined : new Set(cmd.include.split(';').map((it) => it.trim())),
            cmd.force
          )
        })
      }
    )

  program.command('move-account-db-to-pg').action(async () => {
    const { dbUrl } = prepareTools()
    const mongodbUri = getMongoDBUrl()

    if (mongodbUri === dbUrl) {
      throw new Error('MONGO_URL and DB_URL are the same')
    }

    await withAccountDatabase(async (pgDb) => {
      await withAccountDatabase(async (mongoDb) => {
        await moveAccountDbFromMongoToPG(toolCtx, mongoDb, pgDb)
      }, mongodbUri)
    }, dbUrl)
  })

  program
    .command('perfomance')
    .option('-p, --parallel', '', false)
    .action(async (cmd: { parallel: boolean }) => {
      const { txes, version, migrateOperations } = prepareTools()
      await withAccountDatabase(async (db) => {
        const email = generateId()
        const ws = generateId()
        const wsid = getWorkspaceId(ws)
        const start = new Date()
        const measureCtx = new MeasureMetricsContext('create-workspace', {})
        const wsInfo = await createWorkspaceRecord(measureCtx, db, null, email, ws, ws)

        // update the record so it's not taken by one of the workers for the next 60 seconds
        await updateWorkspace(db, wsInfo, {
          mode: 'creating',
          progress: 0,
          lastProcessingTime: Date.now() + 1000 * 60
        })

        await createWorkspace(measureCtx, version, null, wsInfo, txes, migrateOperations, undefined, true)

        await updateWorkspace(db, wsInfo, {
          mode: 'active',
          progress: 100,
          disabled: false,
          version
        })
        await createAcc(toolCtx, db, null, email, '1234', '', '', true)
        await assignAccountToWs(toolCtx, db, null, email, ws, AccountRole.User)
        console.log('Workspace created in', new Date().getTime() - start.getTime(), 'ms')
        const token = generateToken(systemAccountEmail, wsid)
        const endpoint = await getTransactorEndpoint(token, 'external')
        await generateWorkspaceData(endpoint, ws, cmd.parallel, email)
        await testFindAll(endpoint, ws, email)
        await dropWorkspace(toolCtx, db, null, ws)
      })
    })

  program
    .command('reset-ws-attempts <name>')
    .description('Reset workspace creation/upgrade attempts counter')
    .action(async (workspace) => {
      await withAccountDatabase(async (db) => {
        const info = await getWorkspaceById(db, workspace)
        if (info === null) {
          throw new Error(`workspace ${workspace} not found`)
        }

        await updateWorkspace(db, info, {
          attempts: 0
        })

        console.log('Attempts counter for workspace', workspace, 'has been reset')
      })
    })

  program
    .command('generate-uuid-workspaces')
    .description('generate uuids for all workspaces which are missing it')
    .option('-d, --dryrun', 'Dry run', false)
    .action(async (cmd: { dryrun: boolean }) => {
      await withAccountDatabase(async (db) => {
        console.log('generate uuids for all workspaces which are missing it')
        await generateUuidMissingWorkspaces(toolCtx, db, cmd.dryrun)
      })
    })

  program
    .command('update-data-wsid-to-uuid')
    .description('updates workspaceId in pg/cr to uuid')
    .option('-d, --dryrun', 'Dry run', false)
    .action(async (cmd: { dryrun: boolean }) => {
      await withAccountDatabase(async (db) => {
        console.log('updates workspaceId in pg/cr to uuid')
        const { dbUrl } = prepareTools()
        await updateDataWorkspaceIdToUuid(toolCtx, db, dbUrl, cmd.dryrun)
      })
    })

  program
    .command('add-controlled-doc-rank-mongo')
    .description('add rank to controlled documents')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .action(async (cmd: { workspace: string }) => {
      const { version } = prepareTools()

      let workspaces: Workspace[] = []
      await withAccountDatabase(async (db) => {
        workspaces = await listWorkspacesPure(db)
        workspaces = workspaces
          .filter((p) => isActiveMode(p.mode))
          .filter((p) => cmd.workspace === '' || p.workspace === cmd.workspace)
          .sort((a, b) => b.lastVisit - a.lastVisit)
      })

      console.log('found workspaces', workspaces.length)

      const mongodbUri = getMongoDBUrl()
      const client = getMongoClient(mongodbUri)
      const _client = await client.getClient()

      try {
        const count = workspaces.length
        let index = 0
        for (const workspace of workspaces) {
          index++

          toolCtx.info('processing workspace', {
            workspace: workspace.workspace,
            version: workspace.version,
            index,
            count
          })

          if (workspace.version === undefined || !deepEqual(workspace.version, version)) {
            console.log(`upgrade to ${versionToString(version)} is required`)
            continue
          }
          const workspaceId = getWorkspaceId(workspace.workspace)
          const wsDb = getWorkspaceMongoDB(_client, { name: workspace.workspace })

          await addControlledDocumentRank(toolCtx, wsDb, workspaceId)
        }
      } finally {
        client.close()
      }
    })

  program
    .command('fill-github-users')
    .option('-t, --token <token>', 'Github token to increase the limit of requests to GitHub')
    .description('adds github username info to all accounts')
    .action(async (cmd: { token?: string }) => {
      await withAccountDatabase(async (db) => {
        await fillGithubUsers(toolCtx, db, cmd.token)
      })
    })

  extendProgram?.(program)

  program.parse(process.argv)
}
