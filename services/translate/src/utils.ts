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

import core, { Domain, Tx, TxDomainEvent } from '@hcengineering/core'
import {
  CreateMessageEvent,
  MessageEventType,
  RemovePatchEvent,
  UpdatePatchEvent
} from '@hcengineering/communication-sdk-types'
import { BlobID, CardID, Markdown, Message, MessageID, MessageType } from '@hcengineering/communication-types'
import { MessageProcessor } from '@hcengineering/communication-shared'

const COMMUNICATION_DOMAIN = 'communication' as Domain

export function extractCreateMessageData (tx: Tx):
| {
  message: Message
  blobId: BlobID
}
| undefined {
  if (tx._class !== core.class.TxDomainEvent) return undefined

  const domainTx = tx as TxDomainEvent
  if (domainTx.domain !== COMMUNICATION_DOMAIN) return undefined
  if (domainTx.event?.type !== MessageEventType.CreateMessage) return undefined

  const event: CreateMessageEvent = domainTx.event

  if (event.messageType !== MessageType.Text) return undefined
  if (event.options?.noNotify === true) return undefined

  const message = MessageProcessor.create(event)
  const blobId = event._eventExtra?.blobId

  if (message == null) return undefined
  if (blobId == null) return undefined

  return { message, blobId }
}

export function extractUpdateMessageData (tx: Tx):
| {
  cardId: CardID
  messageId: MessageID
  content: Markdown
  blobId: BlobID
}
| undefined {
  if (tx._class !== core.class.TxDomainEvent) return undefined

  const domainTx = tx as TxDomainEvent
  if (domainTx.domain !== COMMUNICATION_DOMAIN) return undefined
  if (domainTx.event?.type !== MessageEventType.UpdatePatch) return undefined

  const event: UpdatePatchEvent = domainTx.event

  const blobId = event._eventExtra?.blobId

  if (event.content == null) return undefined
  if (blobId == null) return undefined

  return { cardId: event.cardId, content: event.content, blobId, messageId: event.messageId }
}

export function extractRemoveMessageData (tx: Tx):
| {
  cardId: CardID
  messageId: MessageID
  blobId: BlobID
}
| undefined {
  if (tx._class !== core.class.TxDomainEvent) return undefined

  const domainTx = tx as TxDomainEvent
  if (domainTx.domain !== COMMUNICATION_DOMAIN) return undefined
  if (domainTx.event?.type !== MessageEventType.RemovePatch) return undefined

  const event: RemovePatchEvent = domainTx.event

  const blobId = event._eventExtra?.blobId

  if (blobId == null) return undefined

  return { messageId: event.messageId, blobId, cardId: event.cardId }
}
