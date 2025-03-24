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

import type { Attribute, Class, Mixin, Ref } from '@hcengineering/core'
import type { BlobID, CardID, ID, RichText, SocialID } from './core'
import type { Card, Tag } from '@hcengineering/card'

export type MessageID = ID & { message: true }

export interface Message {
  id: MessageID
  card: CardID
  type: MessageType
  content: RichText
  creator: SocialID
  created: Date
  data?: MessageData

  edited?: Date
  thread?: Thread
  reactions: Reaction[]
  files: File[]
}

export enum MessageType {
  Message = 'message',
  Activity = 'activity'
}

export type MessageData = ActivityMessageData | any

export interface ActivityMessage extends Message {
  type: MessageType.Activity
  data: ActivityMessageData
}

export interface ActivityMessageData {
  action: 'create' | 'remove' | 'update'
  update?: ActivityUpdate
}

export type ActivityUpdate = ActivityAttributeUpdate | ActivityTagUpdate
export enum ActivityUpdateType {
  Attribute = 'attribute',
  Tag = 'tag'
}

export interface ActivityTagUpdate {
  type: ActivityUpdateType.Tag
  tag: Ref<Tag>
  action: 'add' | 'remove'
}

type AttributeValue = string | number | null

export interface ActivityAttributeUpdate {
  type: ActivityUpdateType.Attribute
  attrKey: string
  attrClass: Ref<Class<Attribute<Card>>>
  mixin?: Ref<Mixin<Card>>
  set?: AttributeValue | AttributeValue[]
  added?: AttributeValue[]
  removed?: AttributeValue[]
}

export interface MessagesGroup {
  card: CardID
  blobId: BlobID
  fromSec: Date
  toSec: Date
  count: number
  patches?: Patch[]
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
  removeReply = 'removeReply',
  addFile = 'addFile',
  removeFile = 'removeFile'
}

export interface Reaction {
  message: MessageID
  reaction: string
  creator: SocialID
  created: Date
}

export interface File {
  card: CardID
  message: MessageID
  blobId: BlobID
  type: string
  filename: string
  size: number
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
