import {
  type ContextID,
  type MessageID,
  type RichText,
  type SocialID,
  type CardID,
  type BlobID,
  type Message,
  type Reaction,
  type Attachment,
  type MessagesGroup,
  type WorkspaceID,
  type PatchType,
  type Patch,
  type Thread
} from '@hcengineering/communication-types'

export enum TableName {
  Attachment = 'communication.attachments',
  Message = 'communication.messages',
  MessagesGroup = 'communication.messages_groups',
  Notification = 'communication.notifications',
  NotificationContext = 'communication.notification_context',
  Patch = 'communication.patch',
  Reaction = 'communication.reactions',
  Thread = 'communication.thread'
}

export interface MessageDb {
  id: MessageID
  workspace_id: WorkspaceID
  card_id: CardID
  content: RichText
  creator: SocialID
  created: Date
  thread_id?: CardID
  replies_count?: number
  last_reply?: Date
}

export interface MessagesGroupDb {
  workspace_id: WorkspaceID
  card_id: CardID
  blob_id: BlobID
  from_date: Date
  to_date: Date
  from_id: MessageID
  to_id: MessageID
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
}

export interface ReactionDb {
  workspace_id: WorkspaceID
  card_id: CardID
  message_id: MessageID
  reaction: string
  creator: SocialID
  created: Date
}

export interface AttachmentDb {
  message_id: MessageID
  card_id: CardID
  creator: SocialID
  created: Date
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
  message_id: MessageID
  context: ContextID
}

export interface ContextDb {
  workspace_id: WorkspaceID
  card_id: CardID
  personal_workspace: WorkspaceID

  archived_from?: Date
  last_view?: Date
  last_update?: Date
}

interface RawMessage extends MessageDb {
  patches?: PatchDb[]
  attachments?: AttachmentDb[]
  reactions?: ReactionDb[]
}

export function toMessage (raw: RawMessage): Message {
  const lastPatch = raw.patches?.[0]

  return {
    id: String(raw.id) as MessageID,
    card: raw.card_id,
    content: lastPatch?.content ?? raw.content,
    creator: raw.creator,
    created: raw.created,
    edited: lastPatch?.created ?? undefined,
    thread:
      raw.thread_id != null
        ? {
            card: raw.card_id,
            message: String(raw.id) as MessageID,
            thread: raw.thread_id,
            repliesCount: raw.replies_count ?? 0,
            lastReply: raw.last_reply ?? new Date()
          }
        : undefined,
    reactions: (raw.reactions ?? []).map(toReaction),
    attachments: (raw.attachments ?? []).map(toAttachment)
  }
}

export function toReaction (raw: ReactionDb): Reaction {
  return {
    message: String(raw.message_id) as MessageID,
    reaction: raw.reaction,
    creator: raw.creator,
    created: raw.created
  }
}

export function toAttachment (raw: AttachmentDb): Attachment {
  return {
    message: String(raw.message_id) as MessageID,
    card: raw.card_id,
    creator: raw.creator,
    created: raw.created
  }
}

export function toMessagesGroup (raw: MessagesGroupDb): MessagesGroup {
  return {
    card: raw.card_id,
    blobId: raw.blob_id,
    fromDate: raw.from_date,
    toDate: raw.to_date,
    fromId: String(raw.from_id) as MessageID,
    toId: String(raw.to_id) as MessageID,
    count: raw.count,
    patches: raw.patches == null ? [] : raw.patches.filter((it: any) => it.message_id != null).map(toPatch)
  }
}

export function toPatch (raw: PatchDb): Patch {
  return {
    type: raw.type,
    message: String(raw.message_id) as MessageID,
    content: raw.content,
    creator: raw.creator,
    created: new Date(raw.created)
  }
}

export function toThread (raw: ThreadDb): Thread {
  return {
    card: raw.card_id,
    message: String(raw.message_id) as MessageID,
    thread: raw.thread_id,
    repliesCount: raw.replies_count,
    lastReply: raw.last_reply
  }
}
