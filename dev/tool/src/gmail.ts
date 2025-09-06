import core, {
  type AccountUuid,
  DOMAIN_MODEL_TX,
  type Doc,
  type IntegrationKind,
  MeasureMetricsContext,
  type PersonId,
  type Ref,
  type SocialId,
  SocialIdType,
  type Tx,
  type TxCUD,
  TxProcessor,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid,
  buildSocialIdString,
  isArchivingMode,
  isDeletingMode,
  systemAccountUuid
} from '@hcengineering/core'
import { getClient as getKvsClient } from '@hcengineering/kvs-client'
import { getAccountsFromTxes, getSocialKeyByOldEmail } from '@hcengineering/model-core'
import { getAccountClient } from '@hcengineering/server-client'
import { generateToken } from '@hcengineering/server-token'

import { type PipelineFactory, createDummyStorageAdapter, wrapPipeline } from '@hcengineering/server-core'
import { createBackupPipeline, createEmptyBroadcastOps } from '@hcengineering/server-pipeline'
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

const GMAIL_INTEGRATION: IntegrationKind = 'gmail' as any
const TOKEN_TYPE = 'token'

export async function performGmailAccountMigrations (
  db: Db,
  dbUrl: string,
  region: string | null,
  kvsUrl: string,
  txes: Tx[]
): Promise<void> {
  console.log('Start Gmail migrations')
  const token = generateToken(systemAccountUuid, undefined, { service: 'admin', admin: 'true' })
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
  const metricsContext = new MeasureMetricsContext('gmail-migrate', {})

  const factory: PipelineFactory = createBackupPipeline(metricsContext, dbUrl, txes, {
    externalStorage: createDummyStorageAdapter(),
    usePassedCtx: true
  })

  await migrateGmailIntegrations(db, token, workspaceProvider, factory, metricsContext)

  await migrateGmailHistory(db, token, kvsUrl, workspaceProvider, factory, metricsContext)
  console.log('Finished Gmail migrations')
}

async function migrateGmailIntegrations (
  db: Db,
  token: string,
  workspaceProvider: WorkspaceInfoProvider,
  factory: PipelineFactory,
  metricsContext: MeasureMetricsContext
): Promise<void> {
  try {
    console.log('Start Gmail account migrations')
    const gmailToken = generateToken(systemAccountUuid, undefined, { service: 'gmail' })
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
        if (isArchivingMode(ws.mode) || isDeletingMode(ws.mode)) {
          continue
        }
        token.workspace = ws.uuid

        const socialKey = await getSocialKeyByOldAccount(ws, token.userId, factory, metricsContext)
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
  workspaceProvider: WorkspaceInfoProvider,
  factory: PipelineFactory,
  metricsContext: MeasureMetricsContext
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
        if (isArchivingMode(ws.mode) || isDeletingMode(ws.mode)) {
          continue
        }
        const socialKey = await getSocialKeyByOldAccount(ws, history.userId, factory, metricsContext)
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
async function getSocialKeyByOldAccount (
  ws: WorkspaceInfoWithStatus,
  userId: string,
  factory: PipelineFactory,
  metricsContext: MeasureMetricsContext
): Promise<string | undefined> {
  if (!accountsMap.has(ws.uuid)) {
    const socialKeyByAccount = await getSociaKeysMap(ws, factory, metricsContext)
    accountsMap.set(ws.uuid, socialKeyByAccount)
  }
  const socialKeyByAccount = accountsMap.get(ws.uuid) ?? {}
  return socialKeyByAccount[userId]
}

async function getSociaKeysMap (
  ws: WorkspaceInfoWithStatus,
  factory: PipelineFactory,
  metricsContext: MeasureMetricsContext
): Promise<Record<string, string>> {
  console.info('Loading accounts from workspace', ws.uuid, ws.name, ws.url)
  const systemAccounts = [core.account.System, core.account.ConfigUser]
  const accounts = await loadAccounts(ws, factory, metricsContext)

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

export async function loadAccounts (
  ws: WorkspaceInfoWithStatus,
  factory: PipelineFactory,
  metricsContext: MeasureMetricsContext
): Promise<(Doc & { email?: string })[]> {
  const pipeline = await factory(metricsContext, ws, createEmptyBroadcastOps(), null)
  const client = wrapPipeline(metricsContext, pipeline, ws, false)

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

  return getAccountsFromTxes(accountsTxes)
}
