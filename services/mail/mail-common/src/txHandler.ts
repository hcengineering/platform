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

import core, { Tx, TxDomainEvent, TxOperations } from '@hcengineering/core'
import { CreateMessageEvent, MessageEventType } from '@hcengineering/communication-sdk-types'
import chat from '@hcengineering/chat'

import { MessageType } from '@hcengineering/communication-types'
import { Card } from '@hcengineering/card'
import mail from '@hcengineering/mail'

import { normalizeEmail } from './utils'
import { COMMUNICATION_DOMAIN } from './types'

export function toMessageEvent (tx: Tx): CreateMessageEvent | undefined {
  if (tx._class !== core.class.TxDomainEvent) {
    return undefined
  }
  const domainTx = tx as TxDomainEvent
  const isCreateMessage =
    domainTx.domain === COMMUNICATION_DOMAIN && domainTx.event?.type === MessageEventType.CreateMessage
  if (!isCreateMessage) {
    return undefined
  }
  const event: CreateMessageEvent = domainTx.event
  const isMessage = event.cardType === chat.masterTag.Thread && event.messageType === MessageType.Message
  if (!isMessage) {
    return undefined
  }
  return event
}

export async function getChannel (client: TxOperations, email: string): Promise<Card | undefined> {
  const normalizedEmail = normalizeEmail(email)
  return await client.findOne<Card>(mail.tag.MailChannel, { title: normalizedEmail })
}
