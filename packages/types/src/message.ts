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
import type { Card, Tag } from '@hcengineering/card'

import type { AccountID, BlobID, CardID, CardType, ID, Markdown, SocialID } from './core'
import { Patch } from './patch'

// Message
export type MessageID = ID & { message: true }

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
  attachments: Attachment[]
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

// Reaction
export interface Reaction {
  reaction: string
  creator: SocialID
  created: Date
}

// LinkPreview
export const linkPreviewType = 'application/vnd.huly.link-preview' as const

export interface LinkPreviewParams {
  url: string
  host: string

  title?: string
  description?: string
  siteName?: string

  iconUrl?: string
  previewImage?: LinkPreviewImage
}

export interface LinkPreviewImage {
  url: string
  width?: number
  height?: number
}

export interface BlobParams {
  blobId: BlobID
  mimeType: string
  fileName: string
  size: number
  metadata?: BlobMetadata
}

// Attachment
export type AttachmentID = string & { __attachmentId: true }

export type Attachment = BlobAttachment | LinkPreviewAttachment | AppletAttachment
interface BaseAttachment<D extends AttachmentParams = AttachmentParams> extends AttachmentData<D> {
  creator: SocialID
  created: Date
  modified?: Date
}

export interface LinkPreviewAttachment extends BaseAttachment<LinkPreviewParams> {
  type: typeof linkPreviewType
}

export interface BlobAttachment extends BaseAttachment<BlobParams> {}

export type AppletParams = Record<string, any>
export type AppletType = `application/vnd.huly.applet.${string}`

export interface AppletAttachment<T extends AppletParams = AppletParams> extends BaseAttachment<T> {
  type: AppletType
}

export interface AttachmentData<P extends AttachmentParams = AttachmentParams> {
  id: AttachmentID
  type: string
  params: P
}

export type AttachmentParams = Record<string, any>

export interface AttachmentUpdateData<P extends AttachmentParams = AttachmentParams> {
  id: AttachmentID
  params: Partial<P>
}

// Thread
export interface Thread {
  cardId: CardID
  messageId: MessageID
  threadId: CardID
  threadType: CardType
  repliesCount: number
  lastReply: Date
}

// MessagesGroup
export interface MessagesGroup {
  cardId: CardID
  blobId: BlobID
  fromDate: Date
  toDate: Date
  count: number
  patches?: Patch[]
}
