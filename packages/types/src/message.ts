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

import type { Attribute, BlobMetadata, Class, Mixin, Ref } from '@hcengineering/core'
import type { BlobID, CardID, CardType, ID, RichText, SocialID } from './core'
import type { Card, Tag } from '@hcengineering/card'

export type MessageID = ID & { message: true }

export interface Message {
  id: MessageID
  card: CardID
  type: MessageType
  content: RichText
  creator: SocialID
  created: Date
  removed: boolean
  data?: MessageData
  externalId?: string

  edited?: Date
  thread?: Thread
  reactions: Reaction[]
  files: File[]
  links: LinkPreview[]
}

export enum MessageType {
  Message = 'message',
  Activity = 'activity',
  Thread = 'thread',
  ThreadRoot = 'threadRoot'
}

export type MessageData = ActivityMessageData | Record<string, any>

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
  fromDate: Date
  toDate: Date
  count: number
  patches?: Patch[]
}

interface BasePatch {
  message: MessageID
  messageCreated: Date
  type: PatchType
  creator: SocialID
  created: Date

  data: Record<string, any>
}

export interface UpdatePatch extends BasePatch {
  type: PatchType.update
  data: UpdatePatchData
}

export interface AddReactionPatch extends BasePatch {
  type: PatchType.addReaction
  data: AddReactionPatchData
}

export interface RemoveReactionPatch extends BasePatch {
  type: PatchType.removeReaction
  data: RemoveReactionPatchData
}
export interface UpdateThreadPatch extends BasePatch {
  type: PatchType.updateThread
  data: UpdateThreadPatchData
}

export interface AddFilePatch extends BasePatch {
  type: PatchType.addFile
  data: AddFilePatchData
}

export interface RemoveFilePatch extends BasePatch {
  type: PatchType.removeFile
  data: RemoveFilePatchData
}
export interface RemovePatch extends BasePatch {
  type: PatchType.remove
  data: {}
}

export type Patch =
  | UpdatePatch
  | RemovePatch
  | AddReactionPatch
  | RemoveReactionPatch
  | AddFilePatch
  | RemoveFilePatch
  | UpdateThreadPatch

export type PatchData =
  | RemovePatchData
  | UpdatePatchData
  | AddReactionPatchData
  | RemoveReactionPatchData
  | AddFilePatchData
  | RemoveFilePatchData
  | UpdateThreadPatchData

export interface UpdateThreadPatchData {
  thread: CardID
  threadType: CardType
  replies?: 'increment' | 'decrement'
}

export interface UpdatePatchData {
  type?: MessageType
  content?: RichText
  data?: MessageData
}

export interface AddReactionPatchData {
  reaction: string
}

export interface RemoveReactionPatchData {
  reaction: string
}

export interface AddFilePatchData {
  blobId: BlobID
  type: string
  filename: string
  size: number
}

export interface RemoveFilePatchData {
  blobId: BlobID
}

type RemovePatchData = {}

export enum PatchType {
  update = 'update',
  remove = 'remove',
  addReaction = 'addReaction',
  removeReaction = 'removeReaction',
  addFile = 'addFile',
  removeFile = 'removeFile',
  updateThread = 'updateThread'
}

export interface Reaction {
  reaction: string
  creator: SocialID
  created: Date
}

export interface FileData {
  blobId: BlobID
  type: string
  filename: string
  size: number
  meta?: BlobMetadata
}

export interface File extends FileData {
  creator: SocialID
  created: Date
}

export type LinkPreviewID = string & { __linkPreviewId: true }

export interface LinkPreviewData {
  url: string
  host: string
  title?: string
  description?: string
  favicon?: string
  hostname?: string
  image?: LinkPreviewImage
}

export interface LinkPreview extends LinkPreviewData {
  id: LinkPreviewID
  creator: SocialID
  created: Date
}

export interface LinkPreviewImage {
  url: string
  width?: number
  height?: number
}

export interface Thread {
  card: CardID
  message: MessageID
  messageCreated: Date
  thread: CardID
  threadType: CardType
  repliesCount: number
  lastReply: Date
}
