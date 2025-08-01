// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { concatLink, type PersonId } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import telegram from './plugin'
import presentation, { getCurrentWorkspaceUuid } from '@hcengineering/presentation'
import login from '@hcengineering/login'
import { telegramIntegrationKind } from '@hcengineering/telegram'
import {
  getIntegrationClient as getIntegrationClientRaw,
  type IntegrationClient
} from '@hcengineering/integration-client'
import { withRetry } from '@hcengineering/retry'
import type { Integration } from '@hcengineering/account-client'

export type IntegrationState =
  | { status: 'authorized' | 'wantcode' | 'wantpassword', number: string, socialId?: PersonId }
  | 'Loading'
  | 'Missing'

export interface TelegramChannel {
  id: string
  name: string
  type: string
  mode: string
}

export interface TelegramChannelConfig extends TelegramChannel {
  access: 'public' | 'private'
  syncEnabled: boolean
  readonlyAccess?: boolean // access update is not supported for existing channels
}

const url = getMetadata(telegram.metadata.TelegramURL) ?? ''

async function _request (method: 'GET' | 'POST' | 'DELETE', path?: string, body?: any): Promise<any> {
  const base = concatLink(url, 'api/integrations')

  const response = await fetch(concatLink(base, path ?? ''), {
    method,
    headers: {
      Authorization: 'Bearer ' + getMetadata(presentation.metadata.Token),
      'Content-Type': 'application/json'
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })

  if (response.status === 200) {
    return await response.json()
  } else if (response.status === 202) {
    return undefined
  } else {
    throw new Error(`Unexpected response: ${response.status}`)
  }
}

async function request (method: 'GET' | 'POST' | 'DELETE', path?: string, body?: any): Promise<any> {
  return await withRetry(async () => await _request(method, path, body))
}

export async function getState (phone: string): Promise<IntegrationState> {
  return await request('GET', phone)
}

export async function restart (phone: string): Promise<IntegrationState> {
  return await request('POST', `${phone}/restart`)
}

export async function listChannels (phone: string): Promise<TelegramChannel[]> {
  return await request('GET', `${phone}/chats`)
}

export async function disconnect (phone: string): Promise<void> {
  await request('DELETE', phone)
}

export async function command (phone: string, command: 'start' | 'next', input?: string): Promise<IntegrationState> {
  return await request('POST', phone, { command, input })
}

export async function getIntegrationClient (): Promise<IntegrationClient> {
  const accountsUrl = getMetadata(login.metadata.AccountsUrl)
  const token = getMetadata(presentation.metadata.Token)
  if (accountsUrl === undefined || token === undefined) {
    throw new Error('Accounts URL or token is not defined')
  }
  return getIntegrationClientRaw(accountsUrl, token, telegramIntegrationKind, 'hulygram')
}

export async function connect (phone: string, socialId: PersonId): Promise<Integration> {
  const client = await getIntegrationClient()
  const connection = await client.connect(socialId, {
    phone
  })
  return await client.integrate(connection, getCurrentWorkspaceUuid())
}
