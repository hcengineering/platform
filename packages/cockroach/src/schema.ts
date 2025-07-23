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

import {
  type AccountID,
  type BlobID,
  type CardID,
  type ContextID,
  type MessageID,
  type MessageType,
  type PatchType,
  type Markdown,
  type SocialID,
  type WorkspaceID,
  type NotificationID,
  type LabelID,
  type CardType,
  NotificationContent,
  NotificationType, AttachmentID
} from '@hcengineering/communication-types'
import { Domain } from '@hcengineering/communication-sdk-types'

export const schemas = {
  [Domain.Message]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    id: 'varchar',
    type: 'varchar',
    content: 'string',
    creator: 'varchar',
    created: 'timestamptz',
    data: 'jsonb'
  },
  [Domain.MessageCreated]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    created: 'timestamptz',
    message_id: 'varchar'
  },
  [Domain.MessagesGroup]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    blob_id: 'uuid',
    from_date: 'timestamptz',
    to_date: 'timestamptz',
    count: 'int8'
  },
  [Domain.Patch]: {
    id: 'int',
    workspace_id: 'uuid',
    card_id: 'varchar',
    message_id: 'varchar',
    type: 'varchar',
    creator: 'varchar',
    created: 'timestamptz',
    message_created: 'timestamptz',
    data: 'jsonb'
  },
  [Domain.Reaction]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    message_id: 'varchar',
    reaction: 'varchar',
    creator: 'varchar',
    created: 'timestamptz'
  },
  [Domain.Thread]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    message_id: 'varchar',
    thread_id: 'varchar',
    thread_type: 'varchar',
    replies_count: 'int',
    last_reply: 'timestamptz'
  },
  [Domain.Attachment]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    message_id: 'varchar',
    id: 'uuid',
    type: 'text',
    params: 'jsonb',
    creator: 'varchar',
    created: 'timestamptz',
    modified: 'timestamptz'
  },
  [Domain.Notification]: {
    id: 'int8',
    context_id: 'int8',
    message_created: 'timestamptz',
    message_id: 'varchar',
    blob_id: 'uuid',
    created: 'timestamptz',
    content: 'jsonb',
    type: 'varchar',
    read: 'bool'
  },
  [Domain.Collaborator]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    account: 'uuid',
    date: 'timestamptz',
    card_type: 'varchar'
  },
  [Domain.Label]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    card_type: 'varchar',
    label_id: 'varchar',
    account: 'uuid',
    created: 'timestamptz'
  },
  [Domain.NotificationContext]: {
    workspace_id: 'uuid',
    card_id: 'varchar',
    id: 'int8',
    account: 'uuid',
    last_view: 'timestamptz',
    last_update: 'timestamptz',
    last_notify: 'timestamptz'
  }
} as const

export interface DomainDbModel {
  [Domain.Message]: MessageDbModel
  [Domain.MessageCreated]: MessageCreatedDbModel
  [Domain.MessagesGroup]: MessagesGroupDbModel
  [Domain.Patch]: PatchDbModel
  [Domain.Reaction]: ReactionDbModel
  [Domain.Thread]: ThreadDbModel
  [Domain.Attachment]: AttachmentDbModel
  // [Domain.LinkPreview]: LinkPreviewDbModel
  [Domain.Notification]: NotificationDbModel
  [Domain.NotificationContext]: ContextDbModel
  [Domain.Collaborator]: CollaboratorDbModel
  [Domain.Label]: LabelDbModel
}

export type DbModel<D extends keyof DomainDbModel> = DomainDbModel[D]

export type DbModelColumn<D extends Domain> = keyof DomainDbModel[D] & string

export type DbModelColumnType<D extends Domain> = DomainDbModel[D][DbModelColumn<D>]

export type DbModelFilter<D extends Domain> = Array<{ column: DbModelColumn<D>, value: DbModelColumnType<D> | DbModelColumnType<D>[] }>
export type DbModelUpdate<D extends Domain> = Array<{
  column: DbModelColumn<D>
  innerKey?: string
  value: any
}>
export type DbModelBatchUpdate<D extends Domain> = Array<{
  key: DbModelColumnType<D>
  column: DbModelColumn<D>
  innerKey?: string
  value: any
}>

interface MessageDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  id: MessageID
  type: MessageType
  content: Markdown
  creator: SocialID
  created: Date
  data?: Record<string, any>
}

interface MessageCreatedDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  created: Date
}

interface MessagesGroupDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  blob_id: BlobID
  from_date: Date
  to_date: Date
  count: number
}

interface PatchDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  type: PatchType
  data: Record<string, any>
  creator: SocialID
  created: Date
  message_created: Date
}

interface AttachmentDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  id: AttachmentID
  type: string
  params: Record<string, any>
  creator: SocialID
  created: Date
  modified?: Date
}

interface ReactionDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  reaction: string
  creator: SocialID
  created: Date
}

interface ThreadDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  thread_id: CardID
  thread_type: CardType
  replies_count: number
  last_reply: Date
}

interface NotificationDbModel {
  id: NotificationID
  type: NotificationType
  read: boolean
  message_id: MessageID | null
  message_created: Date
  blob_id?: BlobID
  context_id: ContextID
  created: Date
  content: NotificationContent
}

interface ContextDbModel {
  id: ContextID
  workspace_id: WorkspaceID
  card_id: CardID
  account: AccountID
  last_update: Date
  last_view: Date
  last_notify: Date
}

interface CollaboratorDbModel {
  workspace_id: WorkspaceID
  card_id: CardID
  card_type: CardType
  account: AccountID
  date: Date
}

interface LabelDbModel {
  workspace_id: WorkspaceID
  label_id: LabelID
  card_id: CardID
  card_type: CardType
  account: AccountID
  created: Date
}
