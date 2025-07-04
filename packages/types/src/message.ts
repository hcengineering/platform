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

  data: Record<string, any>
}

export interface UpdatePatch extends BasePatch {
  type: PatchType.update
  data: UpdatePatchData
}

export interface UpdatePatchData {
  type?: MessageType
  content?: Markdown
  extra?: MessageExtra
}

export interface RemovePatch extends BasePatch {
  type: PatchType.remove
  data: RemovePatchData
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface RemovePatchData {}

export interface ReactionPatch extends BasePatch {
  type: PatchType.reaction
  data: AddReactionPatchData | RemoveReactionPatchData
}

export interface AddReactionPatchData {
  operation: 'add'
  reaction: string
}

export interface RemoveReactionPatchData {
  operation: 'remove'
  reaction: string
}

export interface BlobPatch extends BasePatch {
  type: PatchType.blob
  data: AttachBlobsPatchData | DetachBlobsPatchData | SetBlobsPatchData | UpdateBlobsPatchData
}

export interface AttachBlobsPatchData {
  operation: 'attach'
  blobs: BlobData[]
}

export interface DetachBlobsPatchData {
  operation: 'detach'
  blobIds: BlobID[]
}

export interface SetBlobsPatchData {
  operation: 'set'
  blobs: BlobData[]
}

export interface UpdateBlobsPatchData {
  operation: 'update'
  blobs: BlobUpdateData[]
}

export interface LinkPreviewPatch extends BasePatch {
  type: PatchType.linkPreview
  data: AttachLinkPreviewsPatchData | DetachLinkPreviewsPatchData | SetLinkPreviewsPatchData
}

export interface AttachLinkPreviewsPatchData {
  operation: 'attach'
  previews: (LinkPreviewData & { previewId: LinkPreviewID })[]
}

export interface DetachLinkPreviewsPatchData {
  operation: 'detach'
  previewIds: LinkPreviewID[]
}

export interface SetLinkPreviewsPatchData {
  operation: 'set'
  previews: (LinkPreviewData & { previewId: LinkPreviewID })[]
}

export interface ThreadPatch extends BasePatch {
  type: PatchType.thread
  data: AttachThreadPatchData | UpdateThreadPatchData
}

export interface AttachThreadPatchData {
  operation: 'attach'
  threadId: CardID
  threadType: CardType
}

export interface UpdateThreadPatchData {
  operation: 'update'
  threadId: CardID
  threadType?: CardType
  repliesCountOp?: 'increment' | 'decrement'
  lastReply?: Date
}

export type Patch = UpdatePatch | RemovePatch | ReactionPatch | BlobPatch | LinkPreviewPatch | ThreadPatch

export enum PatchType {
  update = 'update',
  remove = 'remove',
  reaction = 'reaction',
  blob = 'blob',
  linkPreview = 'linkPreview',
  thread = 'thread'
}

export interface Reaction {
  reaction: string
  creator: SocialID
  created: Date
}

export interface BlobData {
  blobId: BlobID
  mimeType: string
  fileName: string
  size: number
  metadata?: BlobMetadata
}

export type BlobUpdateData = { blobId: BlobID } & Partial<BlobData>

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
