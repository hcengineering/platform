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
  type CardType,
  type BlobMetadata,
  type AccountID,
  type LinkPreview,
  type LinkPreviewID
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
  type LabelDb,
  type LinkPreviewDb
} from './schema'

interface RawMessage extends MessageDb {
  thread_id?: CardID
  thread_type?: CardType
  replies_count?: number
  last_reply?: Date
  patches?: PatchDb[]
  files?: FileDb[]
  reactions?: ReactionDb[]
  link_previews?: LinkPreviewDb[]
}

interface RawNotification extends NotificationDb {
  account: AccountID
  message_id: MessageID
  message_type?: MessageType
  message_content?: RichText
  message_creator?: SocialID
  message_data?: MessageData
  message_external_id?: string
  message_group_blob_id?: BlobID
  message_group_from_date?: Date
  message_group_to_date?: Date
  message_group_count?: number
  message_thread_id?: CardID
  message_thread_type?: CardType
  message_replies?: number
  message_last_reply?: Date
  message_patches?: {
    type: PatchType
    data: Record<string, any>
    creator: SocialID
    created: Date
  }[]
  message_files?: {
    blob_id: BlobID
    type: string
    size: number
    filename: string
    meta?: BlobMetadata
    creator: SocialID
    created: Date
  }[]
}

type RawContext = ContextDb & { id: ContextID } & {
  notifications?: RawNotification[]
}

export function toMessage (raw: RawMessage): Message {
  const patches = (raw.patches ?? []).map((it) => toPatch(it))
  const rawMessage: Message = {
    id: String(raw.id) as MessageID,
    type: raw.type,
    card: raw.card_id,
    content: raw.content,
    creator: raw.creator,
    created: new Date(raw.created),
    removed: false,
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
            repliesCount: raw.replies_count != null ? parseInt(raw.replies_count as any) : 0,
            lastReply: raw.last_reply ?? new Date()
          }
        : undefined,
    reactions: (raw.reactions ?? []).map(toReaction),
    files: (raw.files ?? []).map(toFile),
    links: (raw.link_previews ?? []).map(toLinkPreview)
  }

  if (patches.length === 0) {
    return rawMessage
  }

  return applyPatches(rawMessage, patches, [PatchType.update, PatchType.remove])
}

export function toReaction (raw: ReactionDb): Reaction {
  return {
    reaction: raw.reaction,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toFile (raw: Omit<FileDb, 'workspace_id'>): File {
  return {
    blobId: raw.blob_id,
    type: raw.type,
    filename: raw.filename,
    size: Number(raw.size),
    meta: raw.meta,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toLinkPreview (raw: LinkPreviewDb): LinkPreview {
  return {
    id: String(raw.id) as LinkPreviewID,
    url: raw.url,
    host: raw.host,
    title: raw.title ?? undefined,
    description: raw.description ?? undefined,
    favicon: raw.favicon ?? undefined,
    hostname: raw.hostname ?? undefined,
    image: raw.image ?? undefined,
    created: new Date(raw.created),
    creator: raw.creator
  }
}

export function toMessagesGroup (raw: MessagesGroupDb): MessagesGroup {
  return {
    card: raw.card_id,
    blobId: raw.blob_id,
    fromDate: raw.from_date,
    toDate: raw.to_date,
    count: Number(raw.count),
    patches: raw.patches == null ? [] : raw.patches.filter((it: any) => it.message_id != null).map(toPatch)
  }
}

export function toPatch (raw: Omit<PatchDb, 'workspace_id'>): Patch {
  return {
    type: raw.type,
    messageCreated: new Date(raw.message_created),
    message: String(raw.message_id) as MessageID,
    data: raw.data as any,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toThread (raw: ThreadDb): Thread {
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

export function toNotificationContext (raw: RawContext): NotificationContext {
  const lastView = new Date(raw.last_view)
  return {
    id: String(raw.id) as ContextID,
    card: raw.card_id,
    account: raw.account,
    lastView,
    lastUpdate: new Date(raw.last_update),
    lastNotify: raw.last_notify != null ? new Date(raw.last_notify) : undefined,
    notifications: (raw.notifications ?? [])
      .filter((it) => it.id != null)
      .map((it) => toNotificationRaw(raw.id, raw.card_id, { ...it, account: raw.account }))
  }
}

function toNotificationRaw (id: ContextID, card: CardID, raw: RawNotification): Notification {
  const created = new Date(raw.created)
  let message: Message | undefined

  const patches = (raw.message_patches ?? []).map((it) =>
    toPatch({
      card_id: card,
      message_id: raw.message_id,
      type: it.type,
      data: it.data,
      creator: it.creator,
      created: new Date(it.created),
      message_created: raw.message_created ?? created
    })
  )

  if (
    raw.message_content != null &&
    raw.message_creator != null &&
    raw.message_created != null &&
    raw.message_type != null
  ) {
    const messageFiles = raw.message_files?.map((it) =>
      toFile({
        card_id: card,
        message_id: raw.message_id,
        blob_id: it.blob_id,
        type: it.type,
        size: it.size,
        filename: it.filename,
        meta: it.meta,
        creator: it.creator,
        created: it.created,
        message_created: raw.message_created ?? created
      })
    )

    let thread: Thread | undefined

    if (raw.message_thread_id != null && raw.message_thread_type != null) {
      thread = {
        card,
        message: String(raw.message_id) as MessageID,
        messageCreated: raw.message_created != null ? new Date(raw.message_created) : created,
        thread: raw.message_thread_id,
        threadType: raw.message_thread_type,
        repliesCount: Number(raw.message_replies ?? 0),
        lastReply: raw.message_last_reply != null ? new Date(raw.message_last_reply) : created
      }
    }
    message = {
      id: String(raw.message_id) as MessageID,
      type: raw.message_type,
      card,
      removed: false,
      content: raw.message_content,
      data: raw.message_data,
      externalId: raw.message_external_id,
      creator: raw.message_creator,
      created: new Date(raw.message_created),
      edited: undefined,
      reactions: [],
      files: messageFiles ?? [],
      thread,
      links: []
    }

    if (patches.length > 0) {
      message = applyPatches(message, patches, [PatchType.update, PatchType.remove])
    }
  }

  if (message != null) {
    return {
      id: String(raw.id) as NotificationID,
      account: raw.account,
      read: Boolean(raw.read),
      type: raw.type,
      messageId: String(raw.message_id) as MessageID,
      messageCreated: new Date(raw.message_created),
      created,
      context: String(id) as ContextID,
      message,
      content: raw.content
    }
  }

  let messageGroup: MessagesGroup | undefined

  if (raw.message_group_blob_id != null && raw.message_group_from_date != null && raw.message_group_to_date != null) {
    messageGroup = {
      card,
      blobId: raw.message_group_blob_id,
      fromDate: new Date(raw.message_group_from_date),
      toDate: new Date(raw.message_group_to_date),
      count: raw.message_group_count ?? 0,
      patches
    }
  }

  return {
    id: String(raw.id) as NotificationID,
    account: raw.account,
    type: raw.type,
    read: Boolean(raw.read),
    messageId: String(raw.message_id) as MessageID,
    messageCreated: new Date(raw.message_created),
    created,
    context: String(id) as ContextID,
    messageGroup,
    content: raw.content
  }
}

export function toNotification (raw: RawNotification & { card_id: CardID }): Notification {
  return toNotificationRaw(raw.context_id, raw.card_id, raw)
}

export function toCollaborator (raw: CollaboratorDb): Collaborator {
  return {
    account: raw.account,
    cardType: raw.card_type,
    card: raw.card_id
  }
}

export function toLabel (raw: LabelDb): Label {
  return {
    label: raw.label_id,
    card: raw.card_id,
    cardType: raw.card_type,
    account: raw.account,
    created: new Date(raw.created)
  }
}
