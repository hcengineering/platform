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

import type { BlobID, CardID, CardType, Markdown, PersonUuid, SocialID } from './core'
import { MessageID, MessageType, MessageExtra, AttachmentID, AttachmentParams, Emoji } from './message'

export interface MessagesDoc {
  cardId: CardID
  fromDate: string // ISO date
  toDate: string // ISO date
  messages: Record<MessageID, MessageDoc>
  language: string
}

export interface MessageDoc {
  id: MessageID
  cardId: CardID
  created: string // ISO date
  creator: SocialID
  type: MessageType
  content: Markdown
  extra: MessageExtra
  language?: string | null
  modified?: string | null // ISO date

  reactions: Record<Emoji, Record<PersonUuid, { count: number, date: string }>>
  attachments: Record<AttachmentID, AttachmentDoc>
  threads: Record<CardID, ThreadDoc>
}

export interface AttachmentDoc {
  id: AttachmentID
  mimeType: string
  params: AttachmentParams
  creator: SocialID
  created: string // ISO date
  modified: string | null // ISO date
}

export interface ThreadDoc {
  threadId: CardID
  threadType: CardType
  repliesCount: number
  lastReplyDate: string | null // ISO date
  repliedPersons: Record<PersonUuid, number>
}

export type MessagesGroupsDoc = Record<BlobID, MessagesGroupDoc>

export interface MessagesGroupDoc {
  cardId: CardID
  blobId: BlobID
  fromDate: string // ISO date
  toDate: string // ISO date
  count: number
}

export interface TranslatedMessagesDoc {
  cardId: CardID
  messages: Record<MessageID, MessageDoc>
  language: string
}

export interface TranslatesMessageDoc {
  id: MessageID
  created: string // ISO date
  creator: SocialID
  content: Markdown
}
