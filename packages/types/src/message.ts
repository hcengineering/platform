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
import type { AccountID, BlobID, CardID, CardType, ID, Markdown, SocialID } from './core'
import type { Card, Tag } from '@hcengineering/card'

export type MessageID = ID & { message: true }
export type LinkPreviewID = string & { __linkPreviewId: true }

export enum MessageType {
  Message = 'message',
  Activity = 'activity'
}

export type MessageExtra = Record<string, any>

export interface Message {
  id: MessageID
  cardId: CardID
  type: MessageType
  content: Markdown
  extra?: MessageExtra
  creator: SocialID
  created: Date

  removed: boolean
  edited?: Date

  reactions: Reaction[]
  blobs: AttachedBlob[]
  linkPreviews: LinkPreview[]
  thread?: Thread
}

export interface ActivityMessage extends Message {
  type: MessageType.Activity
  extra: ActivityMessageExtra
}

export interface ActivityMessageExtra {
  action: 'create' | 'remove' | 'update'
  update?: ActivityUpdate
}

export type ActivityUpdate =
  | ActivityAttributeUpdate
  | ActivityTagUpdate
  | ActivityTypeUpdate
  | ActivityCollaboratorsUpdate

export enum ActivityUpdateType {
  Attribute = 'attribute',
  Tag = 'tag',
  Collaborators = 'collaborators',
  Type = 'type'
}

export interface ActivityTagUpdate {
  type: ActivityUpdateType.Tag
  tag: Ref<Tag>
  action: 'add' | 'remove'
}

export interface ActivityCollaboratorsUpdate {
  type: ActivityUpdateType.Collaborators
  added: AccountID[]
  removed: AccountID[]
}

export interface ActivityTypeUpdate {
  type: ActivityUpdateType.Type
  newType: CardType
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
  cardId: CardID
  blobId: BlobID
  fromDate: Date
  toDate: Date
  count: number
  patches?: Patch[]
}

interface BasePatch {
  messageId: MessageID
  type: PatchType
  creator: SocialID
  created: Date

  data: PatchData
}

export interface UpdatePatch extends BasePatch {
  type: PatchType.update
  data: UpdatePatchData
}

export interface RemovePatch extends BasePatch {
  type: PatchType.remove
  // eslint-disable-next-line @typescript-eslint/ban-types
  data: {}
}

export interface SetReactionPatch extends BasePatch {
  type: PatchType.setReaction
  data: SetReactionPatchData
}

export interface RemoveReactionPatch extends BasePatch {
  type: PatchType.removeReaction
  data: RemoveReactionPatchData
}

export interface AttachBlobPatch extends BasePatch {
  type: PatchType.attachBlob
  data: AttachBlobPatchData
}

export interface DetachBlobPatch extends BasePatch {
  type: PatchType.detachBlob
  data: DetachBlobPatchData
}

export interface UpdateThreadPatch extends BasePatch {
  type: PatchType.updateThread
  data: UpdateThreadPatchData
}

export type Patch =
  | UpdatePatch
  | RemovePatch
  | SetReactionPatch
  | RemoveReactionPatch
  | AttachBlobPatch
  | DetachBlobPatch
  | UpdateThreadPatch

export type PatchData =
  | RemovePatchData
  | UpdatePatchData
  | SetReactionPatchData
  | RemoveReactionPatchData
  | AttachBlobPatchData
  | DetachBlobPatchData
  | UpdateThreadPatchData

export interface UpdateThreadPatchData {
  threadId: CardID
  threadType: CardType
  repliesCountOp?: 'increment' | 'decrement'
}

export interface UpdatePatchData {
  type?: MessageType
  content?: Markdown
  extra?: MessageExtra
}

export interface SetReactionPatchData {
  reaction: string
}

export interface RemoveReactionPatchData {
  reaction: string
}

export type AttachBlobPatchData = BlobData

export interface DetachBlobPatchData {
  blobId: BlobID
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RemovePatchData {}

export enum PatchType {
  update = 'update',
  remove = 'remove',
  setReaction = 'setReaction',
  removeReaction = 'removeReaction',
  attachBlob = 'attachBlob',
  detachBlob = 'detachBlob',
  updateThread = 'updateThread'
}

export interface Reaction {
  reaction: string
  creator: SocialID
  created: Date
}

export interface BlobData {
  blobId: BlobID
  contentType: string
  fileName: string
  size: number
  metadata?: BlobMetadata
}

export interface AttachedBlob extends BlobData {
  creator: SocialID
  created: Date
}

export interface LinkPreviewImage {
  url: string
  width?: number
  height?: number
}

export interface LinkPreviewData {
  url: string
  host: string

  title?: string
  description?: string
  siteName?: string

  iconUrl?: string
  previewImage?: LinkPreviewImage
}

export interface LinkPreview extends LinkPreviewData {
  id: LinkPreviewID
  creator: SocialID
  created: Date
}

export interface Thread {
  cardId: CardID
  messageId: MessageID
  threadId: CardID
  threadType: CardType
  repliesCount: number
  lastReply: Date
}
