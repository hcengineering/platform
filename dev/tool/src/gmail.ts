import {
  type AccountUuid,
  type PersonId,
  type SocialId,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid,
  SocialIdType,
  buildSocialIdString,
  systemAccountUuid
} from '@hcengineering/core'
import { getAccountClient } from '@hcengineering/server-client'
import { createClient as createKvsClient } from '@hcengineering/server-kvs'
import { generateToken } from '@hcengineering/server-token'
import type { Db } from 'mongodb'

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

async function migrateGmailIntegrations (db: Db, token: string, workspaceProvider: WorkspaceInfoProvider): Promise<void> {
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

        const socialKey = buildSocialIdString({ type: SocialIdType.EMAIL, value: token.userId })
        const socialId = socialKey !== undefined ? await accountClient.findFullSocialIdBySocialKey(socialKey) : undefined
        if (socialId !== undefined) {
          // Check/create integeration in account

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
          const newToken: TokenV2 = {
            ...token,
            workspace: ws?.uuid,
            email: token.userId,
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
        }
      } catch (e) {
        console.error('Error migrating token', token, e)
      }
    }
    console.log('Gmail integrations migrations done')
  } catch (e) {
    console.error('Error migrating tokens', e)
  }
}

async function migrateGmailHistory (db: Db, token: string, kvsUrl: string, workspaceProvider: WorkspaceInfoProvider): Promise<void> {
  try {
    console.log('Start Gmail history migrations')
    const accountClient = getAccountClient(token)
    const history = db.collection<History>('histories')
    const allHistories = await history.find({}).toArray()

    const kvsClient = createKvsClient(kvsUrl, token)

    for (const history of allHistories) {
      try {
        const socialKey = buildSocialIdString({ type: SocialIdType.EMAIL, value: history.userId })
        const socialId = socialKey !== undefined ? await accountClient.findFullSocialIdBySocialKey(socialKey) : undefined
        if (socialId !== undefined) {
          // Update/create history in KVS
          const ws = await workspaceProvider.getWorkspaceInfo(history.workspace as any)
          if (ws == null) {
            continue
          }
          const historyKey = getHistoryKey(ws.uuid, socialId._id)
          const existingHistory = kvsClient.getValue<HistoryV2>(historyKey)
          const updatedHistory: HistoryV2 = {
            ...(existingHistory ?? history),
            email: history.userId,
            workspace: ws.uuid,
            userId: socialId.personUuid as AccountUuid,
            socialId
          }
          await kvsClient.setValue(historyKey, updatedHistory)
        }
      } catch (e) {
        console.error('Error migrating history', history, e)
      }
    }
    console.log('Finished migrating gmail history')
  } catch (e) {
    console.error('Error migrating gmail history', e)
  }
}

function getHistoryKey (workspace: WorkspaceUuid, userId: PersonId): string {
  return `history:${workspace}:${userId}`
}
