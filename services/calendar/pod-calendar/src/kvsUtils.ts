import { WorkspaceUuid } from '@hcengineering/core'
import { KeyValueClient, getClient as getKeyValueClient } from '@hcengineering/kvs-client'
import config from './config'
import { CALENDAR_INTEGRATION, GoogleEmail, Token, User } from './types'
import { getServiceToken } from './utils'

let keyValueClient: KeyValueClient | undefined

export function getKvsClient (): KeyValueClient {
  if (keyValueClient !== undefined) return keyValueClient
  keyValueClient = getKeyValueClient(CALENDAR_INTEGRATION, config.KvsUrl, getServiceToken())
  return keyValueClient
}

export async function getSyncHistory (workspace: WorkspaceUuid): Promise<number | undefined | null> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:calendarSync:${workspace}`
  return await client.getValue(key)
}

export async function setSyncHistory (workspace: WorkspaceUuid): Promise<void> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:calendarSync:${workspace}`
  await client.setValue(key, Date.now())
}

function calendarsHistoryKey (user: User): string {
  return `${CALENDAR_INTEGRATION}:calendarsHistory:${user.workspace}:${user.userId}`
}

export async function getCalendarsSyncHistory (user: User): Promise<string | undefined> {
  const client = getKvsClient()
  return (await client.getValue(calendarsHistoryKey(user))) ?? undefined
}

export async function setCalendarsSyncHistory (user: User, historyId: string): Promise<void> {
  const client = getKvsClient()
  await client.setValue(calendarsHistoryKey(user), historyId)
}

function eventHistoryKey (user: User, calendarId: string): string {
  return `${CALENDAR_INTEGRATION}:eventHistory:${user.workspace}:${user.userId}:${calendarId}`
}

export async function getEventHistory (user: User, calendarId: string): Promise<string | undefined> {
  const client = getKvsClient()
  return (await client.getValue(eventHistoryKey(user, calendarId))) ?? undefined
}

export async function setEventHistory (user: User, calendarId: string, historyId: string): Promise<void> {
  const client = getKvsClient()
  await client.setValue(eventHistoryKey(user, calendarId), historyId)
}

export async function getUserByEmail (email: GoogleEmail): Promise<Token[]> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:users:${email}`
  return (await client.getValue<Token[]>(key)) ?? []
}

export async function addUserByEmail (user: Token, email: GoogleEmail): Promise<void> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:users:${email}`
  const curr = (await client.getValue<Token[]>(key)) ?? []
  curr.push(user)
  await client.setValue<Token[]>(key, curr)
}

export async function removeUserByEmail (user: User, email: GoogleEmail): Promise<void> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:users:${email}`
  const curr = (await client.getValue<User[]>(key)) ?? []
  const newCurr = curr.filter((p) => p.userId !== user.userId || p.workspace !== user.workspace)
  if (newCurr.length === 0) {
    await client.deleteKey(key)
  } else {
    await client.setValue<User[]>(key, newCurr)
  }
}
