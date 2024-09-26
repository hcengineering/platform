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
  ACCOUNT_DB,
  assignWorkspace,
  confirmEmail,
  createAcc,
  createWorkspace as createWorkspaceRecord,
  dropAccount,
  dropWorkspace,
  dropWorkspaceFull,
  getAccount,
  getWorkspaceById,
  listAccounts,
  listWorkspacesByAccount,
  listWorkspacesPure,
  listWorkspacesRaw,
  replacePassword,
  setAccountAdmin,
  setRole,
  updateWorkspace,
  type Workspace
} from '@hcengineering/account'
import { setMetadata } from '@hcengineering/platform'
import {
  backup,
  backupFind,
  backupList,
  backupSize,
  compactBackup,
  createFileBackupStorage,
  createStorageBackupStorage,
  restore
} from '@hcengineering/server-backup'
import serverClientPlugin, {
  BlobClient,
  createClient,
  getTransactorEndpoint,
  getUserWorkspaces,
  login,
  selectWorkspace
} from '@hcengineering/server-client'
import { getServerPipeline } from '@hcengineering/server-pipeline'
import serverToken, { decodeToken, generateToken } from '@hcengineering/server-token'
import toolPlugin, { FileModelLogger } from '@hcengineering/server-tool'
import { createWorkspace, upgradeWorkspace } from '@hcengineering/workspace-service'
import path from 'path'

import { buildStorageFromConfig, createStorageFromConfig, storageConfigFromEnv } from '@hcengineering/server-storage'
import { program, type Command } from 'commander'
import { type Db, type MongoClient } from 'mongodb'
import { clearTelegramHistory } from './telegram'
import { diffWorkspace, recreateElastic, updateField } from './workspace'

import core, {
  AccountRole,
  concatLink,
  generateId,
  getWorkspaceId,
  MeasureMetricsContext,
  metricsToString,
  systemAccountEmail,
  TxOperations,
  versionToString,
  type Data,
  type Doc,
  type Ref,
  type Tx,
  type Version,
  type WorkspaceId,
  type WorkspaceIdWithUrl
} from '@hcengineering/core'
import { consoleModelLogger, type MigrateOperation } from '@hcengineering/model'
import contact from '@hcengineering/model-contact'
import { getMongoClient, getWorkspaceDB, shutdown } from '@hcengineering/mongo'
import { backupDownload } from '@hcengineering/server-backup/src/backup'
import type { StorageAdapter, StorageAdapterEx } from '@hcengineering/server-core'
import { deepEqual } from 'fast-equals'
import { createWriteStream, readFileSync } from 'fs'
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
import { moveFromMongoToPG, moveWorkspaceFromMongoToPG } from './db'
import { fixJsonMarkup, migrateMarkup, restoreLostMarkup } from './markup'
import { fixMixinForeignAttributes, showMixinForeignAttributes } from './mixin'
import { importNotion } from './notion'
import { fixAccountEmails, renameAccount } from './renameAccount'
import { moveFiles, showLostFiles, syncFiles } from './storage'

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
    mongodbUri: string
    dbUrl: string | undefined
    txes: Tx[]
    version: Data<Version>
    migrateOperations: [string, MigrateOperation][]
  },
  extendProgram?: (prog: Command) => void
): void {
  const toolCtx = new MeasureMetricsContext('tool', {})

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

  function getElasticUrl (): string {
    const elasticUrl = process.env.ELASTIC_URL
    if (elasticUrl === undefined) {
      console.error('please provide elastic url')
      process.exit(1)
    }
    return elasticUrl
  }

  function getFrontUrl (): string {
    const frontUrl = process.env.FRONT_URL
    if (frontUrl === undefined) {
      console.error('please provide front url')
      process.exit(1)
    }
    return frontUrl
  }

  const initWS = process.env.INIT_WORKSPACE
  if (initWS !== undefined) {
    setMetadata(toolPlugin.metadata.InitWorkspace, initWS)
  }
  const initScriptUrl = process.env.INIT_SCRIPT_URL
  if (initScriptUrl !== undefined) {
    setMetadata(toolPlugin.metadata.InitScriptURL, initScriptUrl)
  }

  setMetadata(accountPlugin.metadata.Transactors, transactorUrl)
  setMetadata(serverClientPlugin.metadata.Endpoint, accountsUrl)
  setMetadata(serverToken.metadata.Secret, serverSecret)

  async function withDatabase (uri: string, f: (db: Db, client: MongoClient) => Promise<any>): Promise<void> {
    console.log(`connecting to database '${uri}'...`)

    const client = getMongoClient(uri)
    const _client = await client.getClient()
    try {
      await f(_client.db(ACCOUNT_DB), _client)
    } catch (err: any) {
      console.error(err)
    }
    client.close()
    console.log(`closing database connection to '${uri}'...`)
    await shutdown()
  }

  async function withStorage (mongodbUri: string, f: (storageAdapter: StorageAdapter) => Promise<any>): Promise<void> {
    const adapter = buildStorageFromConfig(storageConfigFromEnv(), mongodbUri)
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
      `tools git_version: ${process.env.GIT_REVISION ?? ''} model_version: ${process.env.MODEL_VERSION ?? ''}`
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
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`creating account ${cmd.first as string} ${cmd.last as string} (${email})...`)
        await createAcc(toolCtx, db, null, email, cmd.password, cmd.first, cmd.last, true)
      })
    })

  // import-notion-with-teamspaces /home/anna/work/notion/pages/exported --workspace workspace
  program
    .command('import-notion-with-teamspaces <dir>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      await importFromNotion(dir, cmd.user, cmd.password, cmd.workspace)
    })

  // import-notion-to-teamspace /home/anna/work/notion/pages/exported --workspace workspace --teamspace notion
  program
    .command('import-notion-to-teamspace <dir>')
    .description('import extracted archive exported from Notion as "Markdown & CSV"')
    .requiredOption('-u, --user <user>', 'user')
    .requiredOption('-pw, --password <password>', 'password')
    .requiredOption('-ws, --workspace <workspace>', 'workspace where the documents should be imported to')
    .requiredOption('-ts, --teamspace <teamspace>', 'new teamspace name where the documents should be imported to')
    .action(async (dir: string, cmd) => {
      await importFromNotion(dir, cmd.user, cmd.password, cmd.workspace, cmd.teamspace)
    })

  async function importFromNotion (
    dir: string,
    user: string,
    password: string,
    workspace: string,
    teamspace?: string
  ): Promise<void> {
    if (workspace === '' || user === '' || password === '' || teamspace === '') {
      return
    }

    const userToken = await login(user, password, workspace)
    const allWorkspaces = await getUserWorkspaces(userToken)
    const workspaces = allWorkspaces.filter((ws) => ws.workspace === workspace)
    if (workspaces.length < 1) {
      console.log('Workspace not found: ', workspace)
      return
    }
    const selectedWs = await selectWorkspace(userToken, workspaces[0].workspace)
    console.log(selectedWs)

    function uploader (token: string) {
      return (id: string, data: any) => {
        return fetch(concatLink(getFrontUrl(), '/files'), {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token
          },
          body: data
        })
      }
    }

    const connection = await createClient(selectedWs.endpoint, selectedWs.token)
    const acc = connection.getModel().getAccountByEmail(user)
    if (acc === undefined) {
      console.log('Account not found for email: ', user)
      return
    }
    const client = new TxOperations(connection, acc._id)
    await importNotion(client, uploader(selectedWs.token), dir, teamspace)
    await connection.close()
  }

  program
    .command('reset-account <email>')
    .description('create user and corresponding account in master database')
    .option('-p, --password <password>', 'new user password')
    .action(async (email: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`update account ${email} ${cmd.first as string} ${cmd.last as string}...`)
        await replacePassword(db, email, cmd.password)
      })
    })

  program
    .command('reset-email <email> <newEmail>')
    .description('rename account in accounts and all workspaces')
    .action(async (email: string, newEmail: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`update account ${email} to ${newEmail}`)
        await renameAccount(toolCtx, db, accountsUrl, email, newEmail)
      })
    })

  program
    .command('fix-email <email> <newEmail>')
    .description('fix email in all workspaces to be proper one')
    .action(async (email: string, newEmail: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        console.log(`update account ${email} to ${newEmail}`)
        await fixAccountEmails(toolCtx, db, accountsUrl, email, newEmail)
      })
    })

  program
    .command('compact-db')
    .description('compact all db collections')
    .option('-w, --workspace <workspace>', 'A selected "workspace" only', '')
    .action(async (cmd: { workspace: string }) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        console.log('compacting db ...')
        let gtotal: number = 0
        try {
          const workspaces = await listWorkspacesPure(db)
          for (const workspace of workspaces) {
            if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
              continue
            }
            let total: number = 0
            const wsDb = getWorkspaceDB(client, { name: workspace.workspace })
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
        }
      })
    })

  program
    .command('assign-workspace <email> <workspace>')
    .description('assign workspace')
    .action(async (email: string, workspace: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
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
          await assignWorkspace(
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
    .option('-i, --init <ws>', 'Init from workspace')
    .option('-b, --branding <key>', 'Branding key')
    .action(async (workspace, cmd: { email: string, workspaceName: string, init?: string, branding?: string }) => {
      const { mongodbUri, txes, version, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        const measureCtx = new MeasureMetricsContext('create-workspace', {})
        const brandingObj =
          cmd.branding !== undefined || cmd.init !== undefined ? { key: cmd.branding, initWorkspace: cmd.init } : null
        const wsInfo = await createWorkspaceRecord(measureCtx, db, brandingObj, cmd.email, cmd.workspaceName, workspace)

        // update the record so it's not taken by one of the workers for the next 60 seconds
        await updateWorkspace(db, wsInfo, {
          mode: 'creating',
          progress: 0,
          lastProcessingTime: Date.now() + 1000 * 60
        })

        await createWorkspace(measureCtx, version, brandingObj, wsInfo, txes, migrateOperations)

        await updateWorkspace(db, wsInfo, {
          mode: 'active',
          progress: 100,
          disabled: false,
          version
        })

        console.log('create-workspace done')
      })
    })

  program
    .command('set-user-role <email> <workspace> <role>')
    .description('set user role')
    .action(async (email: string, workspace: string, role: AccountRole, cmd) => {
      const { mongodbUri } = prepareTools()
      console.log(`set user ${email} role for ${workspace}...`)
      await withDatabase(mongodbUri, async (db) => {
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
      const { mongodbUri } = prepareTools()
      console.log(`set user ${email} admin...`)
      await withDatabase(mongodbUri, async (db) => {
        await setAccountAdmin(db, email, role === 'true')
      })
    })

  program
    .command('upgrade-workspace <name>')
    .description('upgrade workspace')
    .option('-f|--force [force]', 'Force update', true)
    .option('-i|--indexes [indexes]', 'Force indexes rebuild', false)
    .action(async (workspace, cmd: { force: boolean, indexes: boolean }) => {
      const { mongodbUri, version, txes, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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
    .option(
      '-c|--console',
      'Display all information into console(default will create logs folder with {workspace}.log files',
      false
    )
    .option('-f|--force [force]', 'Force update', false)
    .action(async (cmd: { logs: string, force: boolean, console: boolean, ignore: string }) => {
      const { mongodbUri, version, txes, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        const workspaces = (await listWorkspacesRaw(db)).filter((ws) => !cmd.ignore.includes(ws.workspace))
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
    .description(
      'remove unused workspaces, please pass --remove to really delete them. Without it will only mark them disabled'
    )
    .option('-r|--remove [remove]', 'Force remove', false)
    .option('-t|--timeout [timeout]', 'Timeout in days', '7')
    .action(async (cmd: { remove: boolean, disable: boolean, exclude: string, timeout: string }) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        const workspaces = new Map((await listWorkspacesPure(db)).map((p) => [p._id.toString(), p]))

        const accounts = await listAccounts(db)

        const _timeout = parseInt(cmd.timeout) ?? 7

        await withStorage(mongodbUri, async (adapter) => {
          // We need to update workspaces with missing workspaceUrl

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
                  toolCtx.warn('  --- unused', {
                    url: ws.workspaceUrl,
                    id: ws.workspace,
                    lastVisitDays
                  })
                  if (cmd.remove) {
                    await dropWorkspaceFull(toolCtx, db, client, null, ws.workspace, adapter)
                  }
                } else {
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
        })
      })
    })

  program
    .command('drop-workspace <name>')
    .description('drop workspace')
    .option('--full [full]', 'Force remove all data', false)
    .action(async (workspace, cmd: { full: boolean }) => {
      const { mongodbUri } = prepareTools()

      await withStorage(mongodbUri, async (storageAdapter) => {
        await withDatabase(mongodbUri, async (db, client) => {
          const ws = await getWorkspaceById(db, workspace)
          if (ws === null) {
            console.log('no workspace exists')
            return
          }
          if (cmd.full) {
            await dropWorkspaceFull(toolCtx, db, client, null, workspace, storageAdapter)
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
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (storageAdapter) => {
        await withDatabase(mongodbUri, async (db, client) => {
          for (const workspace of await listWorkspacesByAccount(db, email)) {
            if (cmd.full) {
              await dropWorkspaceFull(toolCtx, db, client, null, workspace.workspace, storageAdapter)
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
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        for (const workspace of await listWorkspacesByAccount(db, email)) {
          console.log(workspace.workspace, workspace.workspaceUrl, workspace.workspaceName)
        }
      })
    })

  program
    .command('drop-workspace-last-visit')
    .description('drop old workspaces')
    .action(async (cmd: any) => {
      const { mongodbUri } = prepareTools()

      await withStorage(mongodbUri, async (storageAdapter) => {
        await withDatabase(mongodbUri, async (db, client) => {
          const workspacesJSON = await listWorkspacesPure(db)
          for (const ws of workspacesJSON) {
            const lastVisit = Math.floor((Date.now() - ws.lastVisit) / 1000 / 3600 / 24)
            if (lastVisit > 30) {
              await dropWorkspaceFull(toolCtx, db, client, null, ws.workspace, storageAdapter)
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
      const { mongodbUri, version } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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

  program.command('fix-person-accounts').action(async () => {
    const { mongodbUri, version } = prepareTools()
    await withDatabase(mongodbUri, async (db, client) => {
      const ws = await listWorkspacesPure(db)
      for (const w of ws) {
        const wsDb = getWorkspaceDB(client, { name: w.workspace })
        await wsDb.collection('tx').updateMany(
          {
            objectClass: contact.class.PersonAccount,
            objectSpace: null
          },
          { $set: { objectSpace: core.space.Model } }
        )
      }

      console.log('latest model version:', JSON.stringify(version))
    })
  })

  program
    .command('show-accounts')
    .description('Show accounts')
    .action(async () => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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
    .option('-c, --recheck', 'Force hash recheck on server', false)
    .option('-t, --timeout <timeout>', 'Connect timeout in seconds', '30')
    .action(
      async (
        dirName: string,
        workspace: string,
        cmd: {
          skip: string
          force: boolean
          recheck: boolean
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
          recheck: cmd.recheck,
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
    .command('backup-restore <dirName> <workspace> [date]')
    .option('-m, --merge', 'Enable merge of remote and backup content.', false)
    .option('-p, --parallel <parallel>', 'Enable merge of remote and backup content.', '1')
    .option('-c, --recheck', 'Force hash recheck on server', false)
    .option('-i, --include <include>', 'A list of ; separated domain names to include during backup', '*')
    .option('-s, --skip <skip>', 'A list of ; separated domain names to skip during backup', '')
    .description('dump workspace transactions and minio resources')
    .action(
      async (
        dirName: string,
        workspace: string,
        date,
        cmd: { merge: boolean, parallel: string, recheck: boolean, include: string, skip: string }
      ) => {
        const storage = await createFileBackupStorage(dirName)
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await restore(toolCtx, endpoint, wsid, storage, {
          date: parseInt(date ?? '-1'),
          merge: cmd.merge,
          parallel: parseInt(cmd.parallel ?? '1'),
          recheck: cmd.recheck,
          include: cmd.include === '*' ? undefined : new Set(cmd.include.split(';')),
          skip: new Set(cmd.skip.split(';'))
        })
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
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        const storage = await createStorageBackupStorage(toolCtx, adapter, getWorkspaceId(bucketName), dirName)
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await backup(toolCtx, endpoint, wsid, storage)
      })
    })

  program
    .command('backup-compact-s3 <bucketName> <dirName>')
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
      await diffWorkspace(mongodbUri, getWorkspaceId(workspace), txes)
    })

  program
    .command('clear-telegram-history <workspace>')
    .description('clear telegram history')
    .option('-w, --workspace <workspace>', 'target workspace')
    .action(async (workspace: string, cmd) => {
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        await withDatabase(mongodbUri, async (db) => {
          const telegramDB = process.env.TELEGRAM_DATABASE
          if (telegramDB === undefined) {
            console.error('please provide TELEGRAM_DATABASE.')
            process.exit(1)
          }

          console.log(`clearing ${workspace} history:`)
          await clearTelegramHistory(toolCtx, mongodbUri, getWorkspaceId(workspace), telegramDB, adapter)
        })
      })
    })

  program
    .command('clear-telegram-all-history')
    .description('clear telegram history')
    .action(async (cmd) => {
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        await withDatabase(mongodbUri, async (db) => {
          const telegramDB = process.env.TELEGRAM_DATABASE
          if (telegramDB === undefined) {
            console.error('please provide TELEGRAM_DATABASE.')
            process.exit(1)
          }

          const workspaces = await listWorkspacesPure(db)

          for (const w of workspaces) {
            console.log(`clearing ${w.workspace} history:`)
            await clearTelegramHistory(toolCtx, mongodbUri, getWorkspaceId(w.workspace), telegramDB, adapter)
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
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        await withDatabase(mongodbUri, async (db) => {
          const wsid = getWorkspaceId(workspace)
          const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
          await cleanWorkspace(toolCtx, mongodbUri, wsid, adapter, getElasticUrl(), endpoint, cmd)
        })
      })
    })
  program.command('clean-empty-buckets').action(async (cmd: any) => {
    const { mongodbUri } = prepareTools()
    await withStorage(mongodbUri, async (adapter) => {
      const buckets = await adapter.listBuckets(toolCtx)
      for (const ws of buckets) {
        const l = await ws.list()
        if ((await l.next()) === undefined) {
          await l.close()
          // No data, we could delete it.
          console.log('Clean bucket', ws.name)
          await ws.delete()
        } else {
          await l.close()
        }
      }
    })
  })
  program
    .command('upload-file <workspace> <local> <remote> <contentType>')
    .action(async (workspace: string, local: string, remote: string, contentType: string, cmd: any) => {
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        const wsId: WorkspaceId = {
          name: workspace
        }
        const token = generateToken(systemAccountEmail, wsId)
        const endpoint = await getTransactorEndpoint(token)
        const blobClient = new BlobClient(endpoint, token, wsId)
        const buffer = readFileSync(local)
        await blobClient.upload(toolCtx, remote, buffer.length, contentType, buffer)
      })
    })

  program
    .command('download-file <workspace> <remote> <local>')
    .action(async (workspace: string, remote: string, local: string, cmd: any) => {
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
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
    })

  program
    .command('move-files')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-m, --move <move>', 'When set to true, the files will be moved, otherwise copied', 'false')
    .option('-bl, --blobLimit <blobLimit>', 'A blob size limit in megabytes (default 50mb)', '50')
    .option('-c, --concurrency <concurrency>', 'Number of files being processed concurrently', '10')
    .option('--disabled', 'Include disabled workspaces', false)
    .action(
      async (cmd: { workspace: string, move: string, blobLimit: string, concurrency: string, disabled: boolean }) => {
        const params = {
          blobSizeLimitMb: parseInt(cmd.blobLimit),
          concurrency: parseInt(cmd.concurrency),
          move: cmd.move === 'true'
        }

        const { mongodbUri } = prepareTools()
        await withDatabase(mongodbUri, async (db) => {
          await withStorage(mongodbUri, async (adapter) => {
            try {
              const exAdapter = adapter as StorageAdapterEx
              if (exAdapter.adapters === undefined || exAdapter.adapters.size < 2) {
                throw new Error('bad storage config, at least two storage providers are required')
              }

              console.log('moving files to storage provider', exAdapter.defaultAdapter)

              let index = 1
              const workspaces = await listWorkspacesPure(db)
              workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

              for (const workspace of workspaces) {
                if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
                  continue
                }
                if (workspace.disabled === true && !cmd.disabled) {
                  console.log('ignore disabled workspace', workspace.workspace)
                  continue
                }

                console.log('start', workspace.workspace, index, '/', workspaces.length)
                await moveFiles(toolCtx, getWorkspaceId(workspace.workspace), exAdapter, params)
                console.log('done', workspace.workspace)

                index += 1
              }
            } catch (err: any) {
              console.error(err)
            }
          })
        })
      }
    )

  program
    .command('sync-files')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('--disabled', 'Include disabled workspaces', false)
    .action(async (cmd: { workspace: string, disabled: boolean }) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
        await withStorage(mongodbUri, async (adapter) => {
          try {
            const exAdapter = adapter as StorageAdapterEx

            console.log('syncing files from storage provider')

            let index = 1
            const workspaces = await listWorkspacesPure(db)
            workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

            for (const workspace of workspaces) {
              if (workspace.disabled === true && !cmd.disabled) {
                console.log('ignore disabled workspace', workspace.workspace)
                continue
              }

              if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
                continue
              }

              try {
                console.log('start', workspace.workspace, index, '/', workspaces.length)
                await syncFiles(toolCtx, getWorkspaceId(workspace.workspace), exAdapter)
                console.log('done', workspace.workspace)
              } catch (err) {
                console.warn('failed to sync files', err)
              }

              index += 1
            }
          } catch (err: any) {
            console.error(err)
          }
        })
      })
    })

  program
    .command('show-lost-files')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('--disabled', 'Include disabled workspaces', false)
    .option('--all', 'Show all files', false)
    .action(async (cmd: { workspace: string, disabled: boolean, all: boolean }) => {
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        await withStorage(mongodbUri, async (adapter) => {
          try {
            let index = 1
            const workspaces = await listWorkspacesPure(db)
            workspaces.sort((a, b) => b.lastVisit - a.lastVisit)

            for (const workspace of workspaces) {
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
                const wsDb = getWorkspaceDB(client, { name: workspace.workspace })
                await showLostFiles(toolCtx, workspaceId, wsDb, adapter, { showAll: cmd.all })
                console.log('done', workspace.workspace)
              } catch (err) {
                console.error(err)
              }

              index += 1
            }
          } catch (err: any) {
            console.error(err)
          }
        })
      })
    })

  program.command('show-lost-markup <workspace>').action(async (workspace: string, cmd: any) => {
    const { mongodbUri } = prepareTools()
    await withDatabase(mongodbUri, async (db, client) => {
      await withStorage(mongodbUri, async (adapter) => {
        try {
          const workspaceId = getWorkspaceId(workspace)
          const token = generateToken(systemAccountEmail, workspaceId)
          const endpoint = await getTransactorEndpoint(token)
          await restoreLostMarkup(toolCtx, workspaceId, endpoint, adapter, { command: 'show' })
        } catch (err: any) {
          console.error(err)
        }
      })
    })
  })

  program.command('restore-lost-markup <workspace>').action(async (workspace: string, cmd: any) => {
    const { mongodbUri } = prepareTools()
    await withDatabase(mongodbUri, async (db, client) => {
      await withStorage(mongodbUri, async (adapter) => {
        try {
          const workspaceId = getWorkspaceId(workspace)
          const token = generateToken(systemAccountEmail, workspaceId)
          const endpoint = await getTransactorEndpoint(token)
          await restoreLostMarkup(toolCtx, workspaceId, endpoint, adapter, { command: 'restore' })
        } catch (err: any) {
          console.error(err)
        }
      })
    })
  })

  program.command('fix-bw-workspace <workspace>').action(async (workspace: string) => {
    const { mongodbUri } = prepareTools()
    await withStorage(mongodbUri, async (adapter) => {
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
    .command('mixin-fix-foreign-attributes <workspace>')
    .description('mixin-fix-foreign-attributes')
    .option('--mixin <mixin>', 'Mixin class', '')
    .option('--property <property>', 'Property name', '')
    .action(async (workspace: string, cmd: { mixin: string, property: string }) => {
      const { mongodbUri } = prepareTools()
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
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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
        const { mongodbUri } = prepareTools()
        await withDatabase(mongodbUri, async (db, client) => {
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
    .command('fix-skills <workspace> <step>')
    .description('fix skills for workspace')
    .action(async (workspace: string, step: string) => {
      const { mongodbUri } = prepareTools()
      const wsid = getWorkspaceId(workspace)
      const token = generateToken(systemAccountEmail, wsid)
      const endpoint = await getTransactorEndpoint(token)
      await fixSkills(mongodbUri, wsid, endpoint, step)
    })

  program
    .command('restore-ats-types <workspace>')
    .description('Restore recruiting task types for workspace')
    .action(async (workspace: string) => {
      const { mongodbUri } = prepareTools()
      console.log('Restoring recruiting task types in workspace ', workspace, '...')
      const wsid = getWorkspaceId(workspace)
      const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
      await restoreRecruitingTaskTypes(mongodbUri, wsid, endpoint)
    })

  program
    .command('restore-ats-types-2 <workspace>')
    .description('Restore recruiting task types for workspace 2')
    .action(async (workspace: string) => {
      const { mongodbUri } = prepareTools()
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
    .requiredOption('--domain <domain>')
    .action(
      async (
        workspace: string,
        cmd: { objectId: string, objectClass: string, type: string, attribute: string, value: string, domain: string }
      ) => {
        const { mongodbUri } = prepareTools()
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await updateField(mongodbUri, wsid, endpoint, cmd)
      }
    )

  program
    .command('recreate-elastic-indexes <workspace>')
    .description('reindex workspace to elastic')
    .action(async (workspace: string) => {
      const { mongodbUri } = prepareTools()
      const wsid = getWorkspaceId(workspace)
      const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
      await recreateElastic(mongodbUri, wsid, endpoint)
    })

  program
    .command('fix-json-markup <workspace>')
    .description('fixes double converted json markup')
    .action(async (workspace: string) => {
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        const wsid = getWorkspaceId(workspace)
        const endpoint = await getTransactorEndpoint(generateToken(systemAccountEmail, wsid), 'external')
        await fixJsonMarkup(toolCtx, mongodbUri, adapter, wsid, endpoint)
      })
    })

  program
    .command('migrate-markup')
    .description('migrates collaborative markup to storage')
    .option('-w, --workspace <workspace>', 'Selected workspace only', '')
    .option('-c, --concurrency <concurrency>', 'Number of documents being processed concurrently', '10')
    .action(async (cmd: { workspace: string, concurrency: string }) => {
      const { mongodbUri, dbUrl, txes } = prepareTools()
      await withDatabase(mongodbUri, async (db, client) => {
        await withStorage(mongodbUri, async (adapter) => {
          const workspaces = await listWorkspacesPure(db)
          let index = 0
          for (const workspace of workspaces) {
            if (cmd.workspace !== '' && workspace.workspace !== cmd.workspace) {
              continue
            }

            const wsId = getWorkspaceId(workspace.workspace)
            console.log('processing workspace', workspace.workspace, index, workspaces.length)
            const wsUrl: WorkspaceIdWithUrl = {
              name: workspace.workspace,
              workspaceName: workspace.workspaceName ?? '',
              workspaceUrl: workspace.workspaceUrl ?? ''
            }

            const { pipeline } = await getServerPipeline(toolCtx, txes, mongodbUri, dbUrl, wsUrl)

            await migrateMarkup(toolCtx, adapter, wsId, client, pipeline, parseInt(cmd.concurrency))

            console.log('...done', workspace.workspace)
            index++
          }
        })
      })
    })

  program
    .command('remove-duplicates-ids <workspaces>')
    .description('remove duplicates ids for futue migration')
    .action(async (workspaces: string) => {
      const { mongodbUri } = prepareTools()
      await withStorage(mongodbUri, async (adapter) => {
        await removeDuplicateIds(toolCtx, mongodbUri, adapter, accountsUrl, workspaces)
      })
    })

  program.command('move-to-pg <region>').action(async (region: string) => {
    const { mongodbUri, dbUrl } = prepareTools()
    await withDatabase(mongodbUri, async (db) => {
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

  program.command('move-workspace-to-pg <workspace> <region>').action(async (workspace: string, region: string) => {
    const { mongodbUri, dbUrl } = prepareTools()
    await withDatabase(mongodbUri, async (db) => {
      const workspaceInfo = await getWorkspaceById(db, workspace)
      if (workspaceInfo === null) {
        throw new Error(`workspace ${workspace} not found`)
      }
      if (workspaceInfo.region === region) {
        throw new Error(`workspace ${workspace} is already migrated`)
      }
      await moveWorkspaceFromMongoToPG(db, mongodbUri, dbUrl, workspaceInfo, region)
    })
  })

  program
    .command('perfomance')
    .option('-p, --parallel', '', false)
    .action(async (cmd: { parallel: boolean }) => {
      const { mongodbUri, txes, version, migrateOperations } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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

        await createWorkspace(measureCtx, version, null, wsInfo, txes, migrateOperations)

        await updateWorkspace(db, wsInfo, {
          mode: 'active',
          progress: 100,
          disabled: false,
          version
        })
        await createAcc(toolCtx, db, null, email, '1234', '', '', true)
        await assignWorkspace(toolCtx, db, null, email, ws, AccountRole.User)
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
      const { mongodbUri } = prepareTools()
      await withDatabase(mongodbUri, async (db) => {
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

  extendProgram?.(program)

  program.parse(process.argv)
}
