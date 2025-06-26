import { type AccountClient } from '@hcengineering/account-client'
import { calendarIntegrationKind } from '@hcengineering/calendar'
import {
  type PersonId,
  type WorkspaceInfoWithStatus,
  type WorkspaceUuid,
  isActiveMode,
  systemAccountUuid
} from '@hcengineering/core'
import { getClient as getKvsClient } from '@hcengineering/kvs-client'
import { getAccountClient } from '@hcengineering/server-client'
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

interface User extends Credentials {
  userId: string
  workspace: string
  email: string
}

// Updated token and history types
interface UserNew extends Credentials {
  userId: PersonId
  workspace: WorkspaceUuid
  email: string
}

interface OldHistory {
  email: string
  userId: string
  workspace: string
  historyId: string
  calendarId?: string
}

interface SyncHistory {
  workspace: string
  timestamp: number
}

interface WorkspaceInfoProvider {
  getWorkspaceInfo: (workspaceUuid: WorkspaceUuid) => Promise<WorkspaceInfoWithStatus | undefined>
}

export async function performCalendarAccountMigrations (db: Db, region: string | null, kvsUrl: string): Promise<void> {
  console.log('Start calendar migrations')
  const token = generateToken(systemAccountUuid, undefined, { service: 'tool', admin: 'true' })
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

  await migrateCalendarIntegrations(db, token, workspaceProvider)

  await migrateCalendarHistory(db, token, kvsUrl, workspaceProvider)

  console.log('Finished Calendar migrations')
}

const personsMap = new Map<string, PersonId | undefined>()

async function getPersonIdByEmail (accountClient: AccountClient, email: string): Promise<PersonId | undefined> {
  if (personsMap.has(email)) {
    const val = personsMap.get(email)
    return val
  } else {
    const res = await accountClient.findSocialIdBySocialKey(`email:${email}`)
    personsMap.set(email, res)
    return res
  }
}

async function migrateCalendarIntegrations (
  db: Db,
  token: string,
  workspaceProvider: WorkspaceInfoProvider
): Promise<void> {
  try {
    const accountClient = getAccountClient(token)

    const tokens = db.collection<User>('tokens')

    const allTokens = await tokens.find({}).toArray()

    for (const token of allTokens) {
      try {
        const ws = await workspaceProvider.getWorkspaceInfo(token.workspace as any)
        if (ws == null) {
          continue
        }
        if (!isActiveMode(ws.mode)) continue
        token.workspace = ws.uuid

        const personId = await getPersonIdByEmail(accountClient, token.email)
        if (personId == null) {
          console.error('No socialId found for token', token)
          continue
        }
        // Check/create integration in account
        const existing = await accountClient.getIntegration({
          kind: calendarIntegrationKind,
          workspaceUuid: ws.uuid,
          socialId: personId
        })

        if (existing == null) {
          await accountClient.createIntegration({
            kind: calendarIntegrationKind,
            workspaceUuid: ws.uuid,
            socialId: personId
          })
        }

        const existingToken = await accountClient.getIntegrationSecret({
          key: token.email,
          kind: calendarIntegrationKind,
          socialId: personId,
          workspaceUuid: ws.uuid
        })
        const newToken: UserNew = {
          ...token,
          workspace: ws?.uuid,
          email: token.email,
          userId: personId
        }
        if (existingToken == null) {
          await accountClient.addIntegrationSecret({
            key: newToken.email,
            kind: calendarIntegrationKind,
            socialId: personId,
            secret: JSON.stringify(newToken),
            workspaceUuid: newToken.workspace
          })
        } else {
          const updatedToken = {
            ...existingToken,
            ...newToken
          }
          await accountClient.updateIntegrationSecret({
            key: newToken.email,
            kind: calendarIntegrationKind,
            socialId: personId,
            secret: JSON.stringify(updatedToken),
            workspaceUuid: newToken.workspace
          })
        }
      } catch (e) {
        console.error('Error migrating token', token, e)
      }
    }
    console.log('Calendar integrations migrations done, integration count:', allTokens.length)
  } catch (e) {
    console.error('Error migrating tokens', e)
  }
}

async function migrateCalendarHistory (
  db: Db,
  token: string,
  kvsUrl: string,
  workspaceProvider: WorkspaceInfoProvider
): Promise<void> {
  try {
    console.log('Start Calendar history migrations')
    const accountClient = getAccountClient(token)
    const history = db.collection<OldHistory>('histories')
    const allHistories = await history.find({}).toArray()
    const calendarHistory = db.collection<OldHistory>('calendarHistories')
    const calendarHistories = await calendarHistory.find({}).toArray()

    const kvsClient = getKvsClient(calendarIntegrationKind, kvsUrl, token)

    for (const history of [...calendarHistories, ...allHistories]) {
      try {
        const ws = await workspaceProvider.getWorkspaceInfo(history.workspace as any)
        if (ws == null) {
          continue
        }
        if (!isActiveMode(ws.mode)) continue

        const personId = await getPersonIdByEmail(accountClient, history.email)
        if (personId == null) {
          console.error('No socialId found for token', token)
          continue
        }

        const key =
          history.calendarId != null
            ? `${calendarIntegrationKind}:eventHistory:${ws.uuid}:${personId}:${history.email}:${history.calendarId}`
            : `${calendarIntegrationKind}:calendarsHistory:${ws.uuid}:${personId}:${history.email}`

        await kvsClient.setValue(key, history.historyId)
      } catch (e) {
        console.error('Error migrating history', history, e)
      }
    }

    const syncHistory = db.collection<SyncHistory>('syncHistories')
    const syncHistories = await syncHistory.find({}).toArray()
    for (const history of syncHistories) {
      const ws = await workspaceProvider.getWorkspaceInfo(history.workspace as any)
      if (ws == null) {
        continue
      }

      const key = `${calendarIntegrationKind}:calendarSync:${ws.uuid}`
      await kvsClient.setValue(key, history.timestamp)
    }
    console.log('Finished migrating gmail history, count:', allHistories.length)
  } catch (e) {
    console.error('Error migrating gmail history', e)
  }
}
