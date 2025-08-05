import core, {
  buildSocialIdString,
  DOMAIN_MODEL_TX,
  isArchivingMode,
  isDeletingMode,
  MeasureMetricsContext,
  systemAccountUuid,
  TxProcessor,
  type Doc,
  type PersonId,
  type Ref,
  type Tx,
  type TxCUD,
  type WorkspaceUuid,
  type IntegrationKind
} from '@hcengineering/core'
import { getAccountsFromTxes, getSocialKeyByOldEmail } from '@hcengineering/model-core'
import { getAccountClient } from '@hcengineering/server-client'
import { createDummyStorageAdapter, wrapPipeline, type PipelineFactory } from '@hcengineering/server-core'
import { createBackupPipeline, createEmptyBroadcastOps } from '@hcengineering/server-pipeline'
import { generateToken } from '@hcengineering/server-token'
import type { Db } from 'mongodb'

/**
 * @public
 */
export interface GithubIntegrationRecord {
  installationId: number
  workspace: string
  accountId: string // Ref<Account>
}

/**
 * @public
 */
export interface GithubUserRecord {
  _id: string // login
  code?: string | null
  token?: string
  expiresIn?: number | null // seconds
  refreshToken?: string | null
  refreshTokenExpiresIn?: number | null
  authorized?: boolean
  state?: string
  scope?: string
  error?: string | null

  accounts: Record<string, string /* Ref<Account> */>
}

export async function performGithubAccountMigrations (
  db: Db,
  dbUrl: string,
  txes: Tx[],
  region: string | null
): Promise<void> {
  const token = generateToken(systemAccountUuid, undefined, { service: 'admin', admin: 'true' })
  const githubToken = generateToken(systemAccountUuid, undefined, { service: 'github' })
  const accountClient = getAccountClient(token)

  const githubAccountClient = getAccountClient(githubToken)

  const usersCollection = db.collection<GithubUserRecord>('users')

  const integrationCollection = db.collection<GithubIntegrationRecord>('installations')

  const integrations = await integrationCollection.find({}).toArray()
  // Check and apply migrations
  // We need to update all workspace information accordingly

  const allWorkpaces = await accountClient.listWorkspaces(region)
  const byId = new Map(allWorkpaces.map((it) => [it.uuid, it]))
  const oldNewIds = new Map(allWorkpaces.map((it) => [it.dataId ?? it.uuid, it]))

  const allAuthorizations = await usersCollection.find({}).toArray()

  const wsToAuth = new Map<WorkspaceUuid, GithubUserRecord[]>()

  for (const it of allAuthorizations) {
    for (const ws of Object.keys(it.accounts)) {
      const wsId = oldNewIds.get(ws as WorkspaceUuid) ?? byId.get(ws as WorkspaceUuid)
      if (wsId !== undefined) {
        wsToAuth.set(wsId.uuid, (wsToAuth.get(wsId.uuid) ?? []).concat(it))
      }
    }
  }
  const processed = new Set<string>()
  const metricsContext = new MeasureMetricsContext('github-migrate', {})

  const factory: PipelineFactory = createBackupPipeline(metricsContext, dbUrl, txes, {
    externalStorage: createDummyStorageAdapter(),
    usePassedCtx: true
  })

  const replaces = new Map<string, WorkspaceUuid>()

  const failedPersonIds = new Set<PersonId>()
  for (const it of integrations) {
    const ws = oldNewIds.get(it.workspace as any) ?? byId.get(it.workspace as any)
    if (ws != null) {
      if (isArchivingMode(ws.mode) || isDeletingMode(ws.mode)) {
        continue
      }

      console.info('processing workspace', ws.uuid, ws.name, ws.url)

      it.workspace = ws.uuid
      replaces.set(it.workspace, ws.uuid)

      const pipeline = await factory(metricsContext, ws, createEmptyBroadcastOps(), null)
      const client = wrapPipeline(metricsContext, pipeline, ws, false)

      const systemAccounts = [core.account.System, core.account.ConfigUser]
      const accountsTxes: TxCUD<Doc>[] = []

      let idx: number | undefined

      while (true) {
        const info = await client.loadChunk(DOMAIN_MODEL_TX, idx)
        idx = info.idx
        const ids = Array.from(info.docs.map((it) => it.id as Ref<Doc>))
        const docs = (await client.loadDocs(DOMAIN_MODEL_TX, ids)).filter((it) =>
          TxProcessor.isExtendsCUD(it._class)
        ) as TxCUD<Doc>[]
        for (const tx of docs) {
          if (tx.objectClass === 'core:class:Account' || tx.objectClass === 'contact:class:PersonAccount') {
            accountsTxes.push(tx)
          }
        }
        if (info.finished && idx !== undefined) {
          await client.closeChunk(info.idx)
          break
        }
      }
      await client.close()

      const accounts: (Doc & { email?: string })[] = getAccountsFromTxes(accountsTxes)

      const socialKeyByAccount: Record<string, string> = {}
      for (const account of accounts) {
        if (account.email === undefined) {
          continue
        }

        if (systemAccounts.includes(account._id as any)) {
          ;(socialKeyByAccount as any)[account._id] = account._id
        } else {
          socialKeyByAccount[account._id] = buildSocialIdString(getSocialKeyByOldEmail(account.email)) as any
        }
      }

      const sid = socialKeyByAccount[it.accountId]
      const kind: IntegrationKind = 'github' as any
      const userKind: IntegrationKind = 'github-user' as any

      const person = sid !== undefined ? await accountClient.findSocialIdBySocialKey(sid) : undefined
      if (person !== undefined) {
        // Check/create integeration in account

        const existing = await githubAccountClient.getIntegration({
          kind,
          workspaceUuid: ws?.uuid,
          socialId: person
        })

        if (existing == null) {
          try {
            await githubAccountClient.createIntegration({
              kind,
              workspaceUuid: ws?.uuid,
              socialId: person,
              data: {
                installationId: it.installationId
              }
            })
          } catch (err: any) {
            failedPersonIds.add(person)
            console.log(err)
          }
        }
      }

      const users = wsToAuth.get(ws.uuid)
      for (const u of users ?? []) {
        if (processed.has(u._id)) {
          continue
        }
        processed.add(u._id)

        const sid = socialKeyByAccount[u.accounts[ws.dataId ?? ws.uuid]]
        if (sid !== undefined) {
          const person = await accountClient.findSocialIdBySocialKey(sid)
          if (person !== undefined) {
            const { _id, accounts, ...data } = u

            const existing = await githubAccountClient.getIntegration({
              kind: userKind,
              workspaceUuid: null,
              socialId: person
            })

            if (existing == null) {
              try {
                await githubAccountClient.createIntegration({
                  kind: userKind,
                  workspaceUuid: null,
                  socialId: person,
                  data: {
                    login: u._id
                  }
                })
                // Check/create integeration in account
                await githubAccountClient.addIntegrationSecret({
                  kind: userKind,
                  workspaceUuid: null,
                  socialId: person,
                  key: u._id, // github login
                  secret: JSON.stringify(data)
                })
              } catch (err: any) {
                failedPersonIds.add(person)
                console.error(err)
              }
            }
          }
        }
      }
    }
  }
  console.log('Failed to create integrations for', failedPersonIds.size, 'people')
  if (failedPersonIds.size > 0) {
    // We need to remove all integrations for failed persons
    for (const person of failedPersonIds) {
      console.log('Fialed person id', person)
    }
  }
}
