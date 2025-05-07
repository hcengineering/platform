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
  type File,
  type BlobID,
  type CardID,
  type Collaborator,
  type ContextID,
  type Message,
  type MessageID,
  type MessagesGroup,
  type MessageType,
  type Notification,
  type NotificationContext,
  type NotificationID,
  type Patch,
  PatchType,
  type Reaction,
  type RichText,
  type SocialID,
  type Thread,
  type MessageData,
  type Label,
  type CardType
} from '@hcengineering/communication-types'
import { applyPatches } from '@hcengineering/communication-shared'

import {
  type FileDb,
  type CollaboratorDb,
  type ContextDb,
  type MessageDb,
  type MessagesGroupDb,
  type NotificationDb,
  type PatchDb,
  type ReactionDb,
  type ThreadDb,
  type LabelDb
} from './schema'

interface RawMessage extends MessageDb {
  thread_id?: CardID
  thread_type?: CardType
  replies_count?: number
  last_reply?: Date
  patches?: PatchDb[]
  files?: FileDb[]
  reactions?: ReactionDb[]
}

interface RawNotification extends NotificationDb {
  message_id: MessageID
  message_type?: MessageType
  message_content?: RichText
  message_creator?: SocialID
  message_data?: MessageData
  message_external_id?: string
  message_created?: Date
  message_group_blob_id?: BlobID
  message_group_from_date?: Date
  message_group_to_date?: Date
  message_group_count?: number
  message_patches?: {
    patch_type: PatchType
    patch_data: Record<string, any>
    patch_creator: SocialID
    patch_created: Date
  }[]
}

type RawContext = ContextDb & { id: ContextID } & {
  notifications?: RawNotification[]
}

export function toMessage(raw: RawMessage): Message {
  const patches = (raw.patches ?? []).map((it) => toPatch(it))

  const rawMessage: Message = {
    id: String(raw.id) as MessageID,
    type: raw.type,
    card: raw.card_id,
    content: raw.content,
    creator: raw.creator,
    created: new Date(raw.created),
    data: raw.data,
    externalId: raw.external_id,
    thread:
      raw.thread_id != null && raw.thread_type != null
        ? {
            card: raw.card_id,
            message: String(raw.id) as MessageID,
            messageCreated: new Date(raw.created),
            thread: raw.thread_id,
            threadType: raw.thread_type,
            repliesCount: raw.replies_count ? parseInt(raw.replies_count as any) : 0,
            lastReply: raw.last_reply ?? new Date()
          }
        : undefined,
    reactions: (raw.reactions ?? []).map(toReaction),
    files: (raw.files ?? []).map(toFile)
  }

  if (patches.length === 0) {
    return rawMessage
  }

  return applyPatches(rawMessage, patches, [PatchType.update])
}

export function toReaction(raw: ReactionDb): Reaction {
  return {
    message: String(raw.message_id) as MessageID,
    reaction: raw.reaction,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toFile(raw: FileDb): File {
  return {
    card: raw.card_id,
    message: String(raw.message_id) as MessageID,
    messageCreated: new Date(raw.message_created),
    blobId: raw.blob_id,
    type: raw.type,
    filename: raw.filename,
    size: parseInt(raw.size as any),
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toMessagesGroup(raw: MessagesGroupDb): MessagesGroup {
  return {
    card: raw.card_id,
    blobId: raw.blob_id,
    fromDate: raw.from_date,
    toDate: raw.to_date,
    count: Number(raw.count),
    patches: raw.patches == null ? [] : raw.patches.filter((it: any) => it.message_id != null).map(toPatch)
  }
}

export function toPatch(raw: Omit<PatchDb, 'workspace_id'>): Patch {
  return {
    type: raw.type,
    messageCreated: new Date(raw.message_created),
    message: String(raw.message_id) as MessageID,
    data: raw.data as any,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toThread(raw: ThreadDb): Thread {
  return {
    card: raw.card_id,
    message: String(raw.message_id) as MessageID,
    messageCreated: new Date(raw.message_created),
    thread: raw.thread_id,
    threadType: raw.thread_type,
    repliesCount: parseInt(raw.replies_count as any),
    lastReply: new Date(raw.last_reply)
  }
}

export function toNotificationContext(raw: RawContext): NotificationContext {
  const lastView = new Date(raw.last_view)
  return {
    id: String(raw.id) as ContextID,
    card: raw.card_id,
    account: raw.account,
    lastView,
    lastUpdate: new Date(raw.last_update),
    notifications: (raw.notifications ?? [])
      .filter((it) => it.id != null)
      .map((it) => toNotificationRaw(raw.id, raw.card_id, lastView, it))
  }
}

function toNotificationRaw(
  id: ContextID,
  card: CardID,
  lastView: Date | undefined,
  raw: RawNotification
): Notification {
  const created = new Date(raw.created)
  const read = lastView != null && lastView >= created

  let message: Message | undefined

  if (
    raw.message_content != null &&
    raw.message_creator != null &&
    raw.message_created != null &&
    raw.message_type != null
  ) {
    const patches = (raw.message_patches ?? []).map((it) =>
      toPatch({
        card_id: card,
        message_id: raw.message_id,
        type: it.patch_type,
        data: it.patch_data,
        creator: it.patch_creator,
        created: new Date(it.patch_created),
        message_created: raw.message_created ? new Date(raw.message_created) : created
      })
    )

    message = {
      id: String(raw.message_id) as MessageID,
      type: raw.message_type,
      card,
      content: raw.message_content,
      data: raw.message_data,
      externalId: raw.message_external_id,
      creator: raw.message_creator,
      created: new Date(raw.message_created),
      edited: undefined,
      reactions: [],
      files: []
    }

    if (patches.length > 0) {
      message = applyPatches(message, patches, [PatchType.update])
    }
  }

  if (message != null) {
    return {
      id: String(raw.id) as NotificationID,
      read,
      messageId: String(raw.message_id) as MessageID,
      created,
      context: String(id) as ContextID,
      message
    }
  }

  let messageGroup: MessagesGroup | undefined

  if (raw.message_group_blob_id != null && raw.message_group_from_date != null && raw.message_group_to_date != null) {
    messageGroup = {
      card,
      blobId: raw.message_group_blob_id,
      fromDate: new Date(raw.message_group_from_date),
      toDate: new Date(raw.message_group_to_date),
      count: raw.message_group_count ?? 0
    }
  }

  return {
    id: String(raw.id) as NotificationID,
    read,
    messageId: raw.message_id,
    created,
    context: String(id) as ContextID,
    messageGroup
  }
}

export function toNotification(raw: RawNotification & { card_id: CardID; last_view?: Date }): Notification {
  const lastView = raw.last_view != null ? new Date(raw.last_view) : undefined

  return toNotificationRaw(raw.context_id, raw.card_id, lastView, raw)
}

export function toCollaborator(raw: CollaboratorDb): Collaborator {
  return {
    account: raw.account,
    cardType: raw.card_type,
    card: raw.card_id
  }
}

export function toLabel(raw: LabelDb): Label {
  return {
    label: raw.label_id,
    card: raw.card_id,
    cardType: raw.card_type,
    account: raw.account,
    created: new Date(raw.created)
  }
}
