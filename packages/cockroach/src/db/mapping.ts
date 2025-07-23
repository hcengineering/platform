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
  type AccountID,
  type MessageExtra,
  AttachmentID,
  Attachment
} from '@hcengineering/communication-types'
import { Domain } from '@hcengineering/communication-sdk-types'
import { applyPatches } from '@hcengineering/communication-shared'
import { DbModel } from '../schema'

interface RawMessage extends DbModel<Domain.Message> {
  thread_id?: CardID
  thread_type?: CardType
  replies_count?: number
  last_reply?: Date
  patches?: DbModel<Domain.Patch>[]
  attachments?: DbModel<Domain.Attachment>[]
  reactions?: DbModel<Domain.Reaction>[]
}

interface RawMessageGroup extends DbModel<Domain.MessagesGroup> {
  patches?: DbModel<Domain.Patch>[]
}

interface RawNotification extends DbModel<Domain.Notification> {
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
  message_attachments?: {
    id: AttachmentID
    type: string
    params: Record<string, any>
    creator: SocialID
    created: Date
    modified?: Date
  }[]
}

type RawContext = DbModel<Domain.NotificationContext> & { id: ContextID } & {
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
    attachments: (raw.attachments ?? []).map(toAttachment)
  }

  if (patches.length === 0) {
    return rawMessage
  }

  return applyPatches(rawMessage, patches, [PatchType.update, PatchType.remove])
}

export function toReaction (raw: DbModel<Domain.Reaction>): Reaction {
  return {
    reaction: raw.reaction,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toAttachment (raw: Omit<DbModel<Domain.Attachment>, 'workspace_id'>): Attachment {
  return {
    id: String(raw.id) as AttachmentID,
    type: raw.type,
    params: raw.params,
    creator: raw.creator,
    created: new Date(raw.created),
    modified: raw.modified != null ? new Date(raw.modified) : undefined
  } as any as Attachment
}

export function toMessagesGroup (raw: RawMessageGroup): MessagesGroup {
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

export function toPatch (raw: Omit<DbModel<Domain.Patch>, 'workspace_id' | 'message_created'>): Patch {
  return {
    type: raw.type,
    messageId: String(raw.message_id) as MessageID,
    data: raw.data as any,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toThread (raw: DbModel<Domain.Thread>): Thread {
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
    const attachments = raw.message_attachments
      ?.map((it) =>
        toAttachment({
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
      attachments: attachments ?? []
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

export function toCollaborator (raw: DbModel<Domain.Collaborator>): Collaborator {
  return {
    account: raw.account,
    cardType: raw.card_type,
    cardId: raw.card_id
  }
}

export function toLabel (raw: DbModel<Domain.Label>): Label {
  return {
    labelId: raw.label_id,
    cardId: raw.card_id,
    cardType: raw.card_type,
    account: raw.account,
    created: new Date(raw.created)
  }
}
