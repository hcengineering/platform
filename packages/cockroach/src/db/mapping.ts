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
  type AttachedBlob,
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
  type Markdown,
  type SocialID,
  type Thread,
  type Label,
  type CardType,
  type BlobMetadata,
  type AccountID,
  type LinkPreview,
  type LinkPreviewID,
  type MessageExtra
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
} from '../schema'

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
  message_content?: Markdown
  message_creator?: SocialID
  message_data?: MessageExtra
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
    cardId: raw.card_id,
    content: raw.content,
    creator: raw.creator,
    created: new Date(raw.created),
    removed: false,
    extra: raw.data,
    thread:
      raw.thread_id != null && raw.thread_type != null
        ? {
            cardId: raw.card_id,
            messageId: String(raw.id) as MessageID,
            threadId: raw.thread_id,
            threadType: raw.thread_type,
            repliesCount: raw.replies_count != null ? Number(raw.replies_count) : 0,
            lastReply: raw.last_reply ?? new Date()
          }
        : undefined,
    reactions: (raw.reactions ?? []).map(toReaction),
    blobs: (raw.files ?? []).map(toBlob),
    linkPreviews: (raw.link_previews ?? []).map(toLinkPreview)
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

export function toBlob (raw: Omit<FileDb, 'workspace_id'>): AttachedBlob {
  return {
    blobId: raw.blob_id,
    mimeType: raw.type,
    fileName: raw.filename,
    size: Number(raw.size),
    metadata: raw.meta,
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
    iconUrl: raw.favicon ?? undefined,
    siteName: raw.hostname ?? undefined,
    previewImage: raw.image ?? undefined,
    created: new Date(raw.created),
    creator: raw.creator
  }
}

export function toMessagesGroup (raw: MessagesGroupDb): MessagesGroup {
  const patches =
    raw.patches == null
      ? []
      : raw.patches
        .filter((it: any) => it.message_id != null)
        .map(toPatch)
        .sort((a, b) => a.created.getTime() - b.created.getTime())

  return {
    cardId: raw.card_id,
    blobId: raw.blob_id,
    fromDate: raw.from_date,
    toDate: raw.to_date,
    count: Number(raw.count),
    patches
  }
}

export function toPatch (raw: Omit<PatchDb, 'workspace_id' | 'message_created'>): Patch {
  return {
    type: raw.type,
    messageId: String(raw.message_id) as MessageID,
    data: raw.data as any,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toThread (raw: ThreadDb): Thread {
  return {
    cardId: raw.card_id,
    messageId: String(raw.message_id) as MessageID,
    threadId: raw.thread_id,
    threadType: raw.thread_type,
    repliesCount: Number(raw.replies_count),
    lastReply: new Date(raw.last_reply)
  }
}

export function toNotificationContext (raw: RawContext): NotificationContext {
  const lastView = new Date(raw.last_view)
  return {
    id: String(raw.id) as ContextID,
    cardId: raw.card_id,
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

  const patches = (raw.message_patches ?? [])
    .map((it) =>
      toPatch({
        card_id: card,
        message_id: raw.message_id,
        type: it.type,
        data: it.data,
        creator: it.creator,
        created: new Date(it.created)
      })
    )
    .sort((a, b) => a.created.getTime() - b.created.getTime())

  if (
    raw.message_content != null &&
    raw.message_creator != null &&
    raw.message_created != null &&
    raw.message_type != null
  ) {
    const messageBlobs = raw.message_files
      ?.map((it) =>
        toBlob({
          card_id: card,
          message_id: raw.message_id,
          ...it
        })
      )
      .sort((a, b) => a.created.getTime() - b.created.getTime())

    message = {
      id: String(raw.message_id) as MessageID,
      type: raw.message_type,
      cardId: card,
      removed: false,
      content: raw.message_content,
      extra: raw.message_data,
      creator: raw.message_creator,
      created: new Date(raw.message_created),
      edited: undefined,
      reactions: [],
      blobs: messageBlobs ?? [],
      linkPreviews: []
    }

    if (patches.length > 0) {
      message = applyPatches(message, patches, [PatchType.update, PatchType.remove])
    }
  }

  if (message != null) {
    return {
      id: String(raw.id) as NotificationID,
      cardId: card,
      account: raw.account,
      read: Boolean(raw.read),
      type: raw.type,
      messageId: String(raw.message_id) as MessageID,
      messageCreated: new Date(raw.message_created),
      created,
      contextId: String(id) as ContextID,
      message,
      content: raw.content
    }
  }

  return {
    id: String(raw.id) as NotificationID,
    cardId: card,
    account: raw.account,
    type: raw.type,
    read: Boolean(raw.read),
    messageId: String(raw.message_id) as MessageID,
    messageCreated: new Date(raw.message_created),
    created,
    contextId: String(id) as ContextID,
    content: raw.content,
    blobId: raw.blob_id ?? undefined,
    patches
  }
}

export function toNotification (raw: RawNotification & { card_id: CardID }): Notification {
  return toNotificationRaw(raw.context_id, raw.card_id, raw)
}

export function toCollaborator (raw: CollaboratorDb): Collaborator {
  return {
    account: raw.account,
    cardType: raw.card_type,
    cardId: raw.card_id
  }
}

export function toLabel (raw: LabelDb): Label {
  return {
    labelId: raw.label_id,
    cardId: raw.card_id,
    cardType: raw.card_type,
    account: raw.account,
    created: new Date(raw.created)
  }
}
