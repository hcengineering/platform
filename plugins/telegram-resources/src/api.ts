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

import { concatLink } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import telegram from './plugin'
import presentation from '@hcengineering/presentation'

export type Integration = { status: 'authorized' | 'wantcode' | 'wantpassword', number: string } | 'Loading' | 'Missing'

export interface TelegramChannel {
  id: string
  name: string
  type: string
  mode: string
}

export interface TelegramChannelConfig extends TelegramChannel {
  access: 'public' | 'private'
  syncEnabled: boolean
}

const url = getMetadata(telegram.metadata.TelegramURL) ?? ''

async function request (method: 'GET' | 'POST' | 'DELETE', path?: string, body?: any): Promise<any> {
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
  } else {
    throw new Error(`Unexpected response: ${response.status}`)
  }
}

export async function list (): Promise<Integration[]> {
  return await request('GET')
}

export async function listChannels (phone: string): Promise<TelegramChannel[]> {
  return await request('GET', `${phone}/chats`)
}

export async function command (
  phone: string,
  command: 'start' | 'next' | 'cancel',
  input?: string
): Promise<Integration> {
  return await request('POST', phone, { command, input })
}
