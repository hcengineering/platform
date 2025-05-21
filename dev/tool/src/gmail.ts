import core, {
  type AccountUuid,
  type BackupClient,
  type Client,
  DOMAIN_MODEL_TX,
  type Doc,
  type PersonId,
  type Ref,
  type SocialId,
  SocialIdType,
  type TxCUD,
  TxProcessor,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid,
  buildSocialIdString,
  systemAccountUuid
} from '@hcengineering/core'
import { createClient, getAccountClient, getTransactorEndpoint } from '@hcengineering/server-client'
import { getClient as getKvsClient } from '@hcengineering/kvs-client'
import { generateToken } from '@hcengineering/server-token'
import { getAccountsFromTxes, getSocialKeyByOldEmail } from '@hcengineering/model-core'

import type { Db } from 'mongodb'

// Old token and history types
interface Credentials {
  refresh_token?: string | null
  expiry_date?: number | null
  access_token?: string | null
  token_type?: string | null
  id_token?: string | null
  scope?: string
}

interface User {
  userId: string
  workspace: WorkspaceUuid
  token: string
}

type History = User & {
  historyId: string
}

// Updated token and history types
interface UserV2 {
  userId: AccountUuid
  email?: string
  socialId: SocialId
  workspace: WorkspaceUuid
  token: string
}

export type TokenV2 = UserV2 & Credentials

export type HistoryV2 = UserV2 & {
  historyId: string
}

type Token = User & Credentials

interface WorkspaceInfoProvider {
  getWorkspaceInfo: (workspaceUuid: WorkspaceUuid) => Promise<WorkspaceInfoWithStatus | undefined>
}

const GMAIL_INTEGRATION = 'gmail'
const TOKEN_TYPE = 'token'

export async function performGmailAccountMigrations (db: Db, region: string | null, kvsUrl: string): Promise<void> {
  console.log('Start Gmail migrations')
  const token = generateToken(systemAccountUuid, '' as WorkspaceUuid, { service: 'admin', admin: 'true' })
  const accountClient = getAccountClient(token)

  const allWorkpaces = await accountClient.listWorkspaces(region)
  const byId = new Map(allWorkpaces.map((it) => [it.uuid, it]))
  const oldNewIds = new Map(allWorkpaces.map((it) => [it.dataId ?? it.uuid, it]))
  const workspaceProvider: WorkspaceInfoProvider = {
    getWorkspaceInfo: async (workspaceUuid: WorkspaceUuid) => {
      const ws = oldNewIds.get(workspaceUuid as any) ?? byId.get(workspaceUuid as any)
      if (ws == null) {
        console.error('No workspace found for token', workspaceUuid)
        return undefined
      }
      return ws
    }
  }

  await migrateGmailIntegrations(db, token, workspaceProvider)

  await migrateGmailHistory(db, token, kvsUrl, workspaceProvider)
  console.log('Finished Gmail migrations')
}

async function migrateGmailIntegrations (
  db: Db,
  token: string,
  workspaceProvider: WorkspaceInfoProvider
): Promise<void> {
  try {
    console.log('Start Gmail account migrations')
    const gmailToken = generateToken(systemAccountUuid, '' as WorkspaceUuid, { service: 'gmail' })
    const accountClient = getAccountClient(token)

    const gmailAccountClient = getAccountClient(gmailToken)

    const tokens = db.collection<Token>('tokens')

    const allTokens = await tokens.find({}).toArray()

    for (const token of allTokens) {
      try {
        const ws = await workspaceProvider.getWorkspaceInfo(token.workspace as any)
        if (ws == null) {
          continue
        }
        token.workspace = ws.uuid

        const socialKey = await getSocialKeyByOldAccount(ws, token.userId)
        console.log('socialKey', socialKey)
        const socialId =
          socialKey !== undefined ? await accountClient.findFullSocialIdBySocialKey(socialKey) : undefined
        if (socialId == null) {
          console.error('No socialId found for token', token)
          continue
        }
        // Check/create integration in account
        const existing = await gmailAccountClient.getIntegration({
          kind: GMAIL_INTEGRATION,
          workspaceUuid: ws?.uuid,
          socialId: socialId._id
        })

        if (existing == null) {
          await gmailAccountClient.createIntegration({
            kind: GMAIL_INTEGRATION,
            workspaceUuid: ws?.uuid,
            socialId: socialId._id
          })
        }

        const existingToken = await gmailAccountClient.getIntegrationSecret({
          key: TOKEN_TYPE,
          kind: GMAIL_INTEGRATION,
          socialId: socialId._id,
          workspaceUuid: ws?.uuid
        })
        const email = socialId.type === SocialIdType.EMAIL ? socialId.value : undefined
        const newToken: TokenV2 = {
          ...token,
          workspace: ws?.uuid,
          email,
          userId: socialId.personUuid as AccountUuid,
          socialId
        }
        if (existingToken == null) {
          await gmailAccountClient.addIntegrationSecret({
            key: TOKEN_TYPE,
            kind: GMAIL_INTEGRATION,
            socialId: socialId._id,
            secret: JSON.stringify(newToken),
            workspaceUuid: token.workspace
          })
        } else {
          const updatedToken = {
            ...existingToken,
            ...newToken
          }
          await gmailAccountClient.updateIntegrationSecret({
            key: TOKEN_TYPE,
            kind: GMAIL_INTEGRATION,
            socialId: socialId._id,
            secret: JSON.stringify(updatedToken),
            workspaceUuid: token.workspace
          })
        }
      } catch (e) {
        console.error('Error migrating token', token, e)
      }
    }
    console.log('Gmail integrations migrations done, integration count:', allTokens.length)
  } catch (e) {
    console.error('Error migrating tokens', e)
  }
}

async function migrateGmailHistory (
  db: Db,
  token: string,
  kvsUrl: string,
  workspaceProvider: WorkspaceInfoProvider
): Promise<void> {
  try {
    console.log('Start Gmail history migrations')
    const accountClient = getAccountClient(token)
    const history = db.collection<History>('histories')
    const allHistories = await history.find({}).toArray()

    const kvsClient = getKvsClient('gmail', kvsUrl, token)

    for (const history of allHistories) {
      try {
        const ws = await workspaceProvider.getWorkspaceInfo(history.workspace as any)
        if (ws == null) {
          continue
        }
        const socialKey = await getSocialKeyByOldAccount(ws, history.userId)
        const socialId =
          socialKey !== undefined ? await accountClient.findFullSocialIdBySocialKey(socialKey) : undefined
        if (socialId == null) {
          console.error('No socialId found for history', history)
          continue
        }
        // Update/create history in KVS
        const historyKey = getHistoryKey(ws.uuid, socialId._id)
        const existingHistory = await kvsClient.getValue<HistoryV2>(historyKey)
        const email = socialId.type === SocialIdType.EMAIL ? socialId.value : undefined
        const updatedHistory: HistoryV2 = {
          ...(existingHistory ?? history),
          email,
          workspace: ws.uuid,
          userId: socialId.personUuid as AccountUuid,
          socialId
        }
        await kvsClient.setValue(historyKey, updatedHistory)
      } catch (e) {
        console.error('Error migrating history', history, e)
      }
    }
    console.log('Finished migrating gmail history, count:', allHistories.length)
  } catch (e) {
    console.error('Error migrating gmail history', e)
  }
}

function getHistoryKey (workspace: WorkspaceUuid, userId: PersonId): string {
  return `history:${workspace}:${userId}`
}

const accountsMap = new Map<WorkspaceUuid, Record<string, string>>()
async function getSocialKeyByOldAccount (ws: WorkspaceInfoWithStatus, userId: string): Promise<string | undefined> {
  if (!accountsMap.has(ws.uuid)) {
    const socialKeyByAccount = await getSociaKeysMap(ws)
    accountsMap.set(ws.uuid, socialKeyByAccount)
  }
  const socialKeyByAccount = accountsMap.get(ws.uuid) ?? {}
  return socialKeyByAccount[userId]
}

async function getSociaKeysMap (ws: WorkspaceInfoWithStatus): Promise<Record<string, string>> {
  const systemAccounts = [core.account.System, core.account.ConfigUser]
  const accounts = await loadAccounts(ws)

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
  return socialKeyByAccount
}

export async function loadAccounts (ws: WorkspaceInfoWithStatus): Promise<(Doc & { email?: string })[]> {
  const wsToken = generateToken(systemAccountUuid, ws.uuid, { service: 'gmail', mode: 'backup' })
  const endpoint = await getTransactorEndpoint(wsToken, 'external')
  const client = (await createClient(endpoint, wsToken)) as BackupClient & Client

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

  return getAccountsFromTxes(accountsTxes)
}
