//
// Copyright © 2025 Hardcore Engineering Inc.
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
import { getClient as getAccountClient, AccountClient } from '@hcengineering/account-client'
import { createRestTxOperations } from '@hcengineering/api-client'
import calendar from '@hcengineering/calendar'
import { AccountUuid, MeasureContext, TxOperations, WorkspaceUuid, systemAccountUuid } from '@hcengineering/core'
import { generateToken } from '@hcengineering/server-token'
import config from './config'
import { type EventCUDMessage } from './types'
import { createNotification } from './notification'
import contact from '@hcengineering/contact'

async function getClient (workspaceUuid: WorkspaceUuid): Promise<{ client: TxOperations, accountClient: AccountClient }> {
  const token = generateToken(systemAccountUuid, workspaceUuid)
  const accountClient = getAccountClient(config.accountsUrl, token)
  const wsInfo = await accountClient.getLoginInfoByToken()
  if (!('endpoint' in wsInfo)) {
    throw new Error('Invalid login info')
  }
  const transactorUrl = wsInfo.endpoint.replace('ws://', 'http://').replace('wss://', 'https://')
  const client = await createRestTxOperations(transactorUrl, wsInfo.workspace, wsInfo.token)
  return { client, accountClient }
}

export async function eventCreated (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  message: EventCUDMessage
): Promise<void> {
  const { eventId } = message
  ctx.info('Event created', { workspaceUuid, eventId })
  const { client, accountClient } = await getClient(workspaceUuid)
  const event = await client.findOne(calendar.class.Event, { _id: eventId })
  if (event === undefined) {
    throw new Error('Event not found')
  }
  const personUuid = await accountClient.findPersonBySocialId(event.user, true)
  if (personUuid === undefined) {
    throw new Error('Global person not found')
  }
  const person = await client.findOne(contact.class.Person, { personUuid }, { projection: { _id: 1 } })
  if (person === undefined) {
    throw new Error('Local person not found')
  }
  const space = await client.findOne(contact.class.PersonSpace, { person: person._id }, { projection: { _id: 1 } })
  if (space === undefined) {
    throw new Error('Person space not found')
  }
  await createNotification(
    client,
    event,
    personUuid as AccountUuid,
    space._id,
    calendar.string.MeetingScheduledNotification,
    {}
  )
}

export async function eventUpdated (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  message: EventCUDMessage
): Promise<void> {
  const { eventId } = message
  ctx.info('Event updated', { workspaceUuid, eventId })
}

export async function eventDeleted (
  ctx: MeasureContext,
  workspaceUuid: WorkspaceUuid,
  message: EventCUDMessage
): Promise<void> {
  const { eventId } = message
  ctx.info('Event deleted', { workspaceUuid, eventId })
}
