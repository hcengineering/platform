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

import type { Ref, Blob, PersonId, WorkspaceUuid } from '@hcengineering/core'
import type { Card } from '@hcengineering/card'

export type BlobID = Ref<Blob>
export type CardID = Ref<Card>
export type SocialID = PersonId
export type WorkspaceID = WorkspaceUuid
export type RichText = string

export type ID = string
export type MessageID = string & { message: true }

export interface Message {
  id: MessageID
  card: CardID
  content: RichText
  creator: SocialID
  created: Date

  edited?: Date
  thread?: Thread
  reactions: Reaction[]
  attachments: Attachment[]
}

export interface MessagesGroup {
  card: CardID
  blobId: BlobID
  fromId: MessageID
  toId: MessageID
  fromDate: Date
  toDate: Date
  count: number
  patches: Patch[]
}

export interface Patch {
  message: MessageID
  type: PatchType
  content: string
  creator: SocialID
  created: Date
}

export enum PatchType {
  update = 'update',
  addReaction = 'addReaction',
  removeReaction = 'removeReaction',
  addReply = 'addReply',
  removeReply = 'removeReply'
}

export interface Reaction {
  message: MessageID
  reaction: string
  creator: SocialID
  created: Date
}

export interface Attachment {
  message: MessageID
  card: CardID
  creator: SocialID
  created: Date
}

export interface Thread {
  card: CardID
  message: MessageID
  thread: CardID
  repliesCount: number
  lastReply: Date
}
