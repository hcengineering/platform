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

export async function getSyncHistory (workspace: WorkspaceUuid): Promise<number | undefined> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:calendarSync:${workspace}`
  const res = await client.getValue<number>(key)
  return res ?? undefined
}

export async function setSyncHistory (workspace: WorkspaceUuid): Promise<void> {
  const client = getKvsClient()
  const key = `${CALENDAR_INTEGRATION}:calendarSync:${workspace}`
  await client.setValue(key, Date.now())
}

function calendarsHistoryKey (user: User, email: GoogleEmail): string {
  return `${CALENDAR_INTEGRATION}:calendarsHistory:${user.workspace}:${user.userId}:${email}`
}

export async function getCalendarsSyncHistory (user: User, email: GoogleEmail): Promise<string | undefined> {
  const client = getKvsClient()
  return (await client.getValue(calendarsHistoryKey(user, email))) ?? undefined
}

export async function setCalendarsSyncHistory (user: User, email: GoogleEmail, historyId: string): Promise<void> {
  const client = getKvsClient()
  await client.setValue(calendarsHistoryKey(user, email), historyId)
}

function eventHistoryKey (user: User, email: GoogleEmail, calendarId: string): string {
  return `${CALENDAR_INTEGRATION}:eventHistory:${user.workspace}:${user.userId}:${email}:${calendarId}`
}

export async function getEventHistory (user: User, email: GoogleEmail, calendarId: string): Promise<string | undefined> {
  const client = getKvsClient()
  return (await client.getValue(eventHistoryKey(user, email, calendarId))) ?? undefined
}

export async function setEventHistory (
  user: User,
  email: GoogleEmail,
  calendarId: string,
  historyId: string
): Promise<void> {
  const client = getKvsClient()
  await client.setValue(eventHistoryKey(user, email, calendarId), historyId)
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
  const exists = curr.find((p) => p.userId === user.userId && p.workspace === user.workspace)
  if (exists !== undefined) {
    return
  }
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
