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
  type RichText,
  type SocialID,
  type WorkspaceID,
  type NotificationID
} from '@hcengineering/communication-types'

export enum TableName {
  File = 'communication.files',
  Message = 'communication.messages',
  MessagesGroup = 'communication.messages_groups',
  Notification = 'communication.notifications',
  NotificationContext = 'communication.notification_context',
  Patch = 'communication.patch',
  Reaction = 'communication.reactions',
  Thread = 'communication.thread',
  Collaborators = 'communication.collaborators'
}

export interface MessageDb {
  id: MessageID
  type: MessageType
  workspace_id: WorkspaceID
  card_id: CardID
  content: RichText
  creator: SocialID
  created: Date
  data?: any
}

export interface MessagesGroupDb {
  workspace_id: WorkspaceID
  card_id: CardID
  blob_id: BlobID
  from_sec: Date
  to_sec: Date
  count: number
  patches?: PatchDb[]
}

export interface PatchDb {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  type: PatchType
  content: RichText
  creator: SocialID
  created: Date
  message_created_sec: Date
}

export interface ReactionDb {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  reaction: string
  creator: SocialID
  created: Date
}

export interface FileDb {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  blob_id: BlobID
  filename: string
  size: number
  type: string
  creator: SocialID
  created: Date
  message_created_sec: Date
}

export interface ThreadDb {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  thread_id: CardID
  replies_count: number
  last_reply: Date
}

export interface NotificationDb {
  id: NotificationID
  message_id: MessageID | null
  context_id: ContextID
  created: Date
}

export interface ContextDb {
  workspace_id: WorkspaceID
  card_id: CardID
  account: AccountID
  last_update: Date
  last_view: Date
}

export interface CollaboratorDb {
  workspace_id: WorkspaceID
  card_id: CardID
  account: AccountID
  date: Date
}
