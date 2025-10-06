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
import type { Process, State } from '@hcengineering/process'

import type { AccountUuid, BlobID, CardID, CardType, ID, Markdown, SocialID, PersonUuid } from './core'

// Message
export type MessageID = ID & { message: true }
export type Emoji = string & { emoji: true }

export enum MessageType {
  Text = 'text',
  Activity = 'activity'
}

export type MessageExtra = Record<string, any>

export interface Message {
  id: MessageID
  cardId: CardID

  type: MessageType
  content: Markdown
  extra?: MessageExtra
  language?: string

  creator: SocialID
  created: Date
  modified?: Date

  reactions: Record<Emoji, EmojiData[]>
  attachments: Attachment[]
  threads: Thread[]
  translates?: Record<string, Markdown>
}

export type TranslatedMessage = Pick<Message, 'id' | 'content' | 'creator' | 'created'>

export interface EmojiData {
  count: number
  person: PersonUuid
  date: Date
}

export type MessageMeta = Pick<Message, 'id' | 'cardId' | 'created' | 'creator'> & { blobId: BlobID }

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
  | ActivityProcess

export enum ActivityUpdateType {
  Attribute = 'attribute',
  Tag = 'tag',
  Collaborators = 'collaborators',
  Type = 'type',
  Process = 'process'
}

export interface ActivityProcess {
  type: ActivityUpdateType.Process
  process: Ref<Process>
  action: 'started' | 'complete' | 'transition'
  transitionTo?: Ref<State>
}

export interface ActivityTagUpdate {
  type: ActivityUpdateType.Tag
  tag: Ref<Tag>
  action: 'add' | 'remove'
}

export interface ActivityCollaboratorsUpdate {
  type: ActivityUpdateType.Collaborators
  added: AccountUuid[]
  removed: AccountUuid[]
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
  mimeType: typeof linkPreviewType
}

export interface BlobAttachment extends BaseAttachment<BlobParams> {}

export type AppletParams = Record<string, any>
export type AppletType = `application/vnd.huly.applet.${string}`

export interface AppletAttachment<T extends AppletParams = AppletParams> extends BaseAttachment<T> {
  mimeType: AppletType
}

export interface AttachmentData<P extends AttachmentParams = AttachmentParams> {
  id: AttachmentID
  mimeType: string
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
  lastReplyDate: Date | undefined
  repliedPersons: Record<PersonUuid, number>
}

export type ThreadMeta = Pick<Thread, 'cardId' | 'messageId' | 'threadId' | 'threadType'>

// MessagesGroup
export interface MessagesGroup {
  cardId: CardID
  blobId: BlobID
  fromDate: Date
  toDate: Date
  count: number
}
