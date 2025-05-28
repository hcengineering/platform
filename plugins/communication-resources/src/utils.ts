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

import { getCommunicationClient } from '@hcengineering/presentation'
import { type Card } from '@hcengineering/card'
import { getCurrentAccount } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'

import communication from './plugin'

export async function unsubscribe (card: Card): Promise<void> {
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  await client.removeCollaborators(card._id, card._class, [me.uuid])
}

export async function subscribe (card: Card): Promise<void> {
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  await client.addCollaborators(card._id, card._class, [me.uuid])
}

export async function canSubscribe (card: Card): Promise<boolean> {
  const isEnabled = getMetadata(communication.metadata.Enabled) === true
  if (!isEnabled) return false
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  const collaborator = (await client.findCollaborators({ card: card._id, account: me.uuid, limit: 1 }))[0]
  return collaborator === undefined
}

export async function canUnsubscribe (card: Card): Promise<boolean> {
  const isEnabled = getMetadata(communication.metadata.Enabled) === true
  if (!isEnabled) return false
  const client = getCommunicationClient()
  const me = getCurrentAccount()
  const collaborator = (await client.findCollaborators({ card: card._id, account: me.uuid, limit: 1 }))[0]
  return collaborator !== undefined
}
