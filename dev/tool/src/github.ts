import core, {
  buildSocialIdString,
  DOMAIN_MODEL_TX,
  systemAccountUuid,
  TxProcessor,
  type BackupClient,
  type Client,
  type Doc,
  type Ref,
  type TxCUD,
  type WorkspaceUuid
} from '@hcengineering/core'
import { getAccountsFromTxes, getSocialKeyByOldEmail } from '@hcengineering/model-core'
import { createClient, getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
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

export async function performGithubAccountMigrations (db: Db, region: string | null): Promise<void> {
  const token = generateToken(systemAccountUuid, '' as WorkspaceUuid, { service: 'admin', admin: 'true' })
  const githubToken = generateToken(systemAccountUuid, '' as WorkspaceUuid, { service: 'github' })
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

  const replaces = new Map<string, WorkspaceUuid>()
  for (const it of integrations) {
    const ws = oldNewIds.get(it.workspace as any) ?? byId.get(it.workspace as any)
    if (ws != null) {
      // Need to connect to workspace to get account mapping

      it.workspace = ws.uuid
      replaces.set(it.workspace, ws.uuid)

      const wsToken = generateToken(systemAccountUuid, ws.uuid, { service: 'github', mode: 'backup' })
      const endpoint = await getTransactorEndpoint(wsToken, 'external')
      const client = (await createClient(endpoint, wsToken)) as BackupClient & Client

      const systemAccounts = [core.account.System, core.account.ConfigUser]
      const accountsTxes: TxCUD<Doc>[] = []

      let idx: number | undefined

      while (true) {
        const info = await client.loadChunk(ws.uuid, DOMAIN_MODEL_TX, idx)
        idx = info.idx
        const ids = Array.from(info.docs.map((it) => it.id as Ref<Doc>))
        const docs = (await client.loadDocs(ws.uuid, DOMAIN_MODEL_TX, ids)).filter((it) =>
          TxProcessor.isExtendsCUD(it._class)
        ) as TxCUD<Doc>[]
        accountsTxes.push(...docs)
        if (info.finished && idx !== undefined) {
          await client.closeChunk(ws.uuid, info.idx)
          break
        }
      }
      await client.close()

      // await client.loadChunk(DOMAIN_MODEL_TX,  {
      //   objectClass: { $in: ['core:class:Account', 'contact:class:PersonAccount'] as Ref<Class<Doc>>[] }
      // })
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

      const person = sid !== undefined ? await accountClient.findSocialIdBySocialKey(sid) : undefined
      if (person !== undefined) {
        // Check/create integeration in account

        const existing = await githubAccountClient.getIntegration({
          kind: 'github',
          workspaceUuid: ws?.uuid,
          socialId: person
        })

        if (existing == null) {
          await githubAccountClient.createIntegration({
            kind: 'github',
            workspaceUuid: ws?.uuid,
            socialId: person,
            data: {
              installationId: it.installationId
            }
          })
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
              kind: 'github-user',
              workspaceUuid: null,
              socialId: person
            })

            if (existing == null) {
              await githubAccountClient.createIntegration({
                kind: 'github-user',
                workspaceUuid: null,
                socialId: person,
                data: {
                  login: u._id
                }
              })
              // Check/create integeration in account
              await githubAccountClient.addIntegrationSecret({
                kind: 'github-user',
                workspaceUuid: null,
                socialId: person,
                key: u._id, // github login
                secret: JSON.stringify(data)
              })
            }
          }
        }
      }
    }
  }
}
