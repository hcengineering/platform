import type {ContextID, MessageID, RichText, SocialID, CardID, BlobID, Message, Reaction, Attachment, MessagesGroup, WorkspaceID } from "@hcengineering/communication-types"

export enum TableName {
    Message = 'communication.messages',
    MessagesGroup = 'communication.messages_groups',
    Patch = 'communication.patch',
    Attachment = 'communication.attachments',
    Reaction = 'communication.reactions',
    Notification = 'communication.notifications',
    NotificationContext = 'communication.notification_context'
}

export interface MessageDb {
    id: MessageID,
    workspace_id: WorkspaceID,
    card_id: CardID,
    content: RichText,
    creator: SocialID,
    created: Date,
}

export interface MessagesGroupDb {
    workspace_id: WorkspaceID,
    card_id: CardID,
    blob_id: BlobID,
    from_id: MessageID,
    to_id: MessageID,
    from_date: Date,
    to_date: Date,
    count: number
}

export interface PatchDb {
    workspace_id: WorkspaceID,
    card_id: CardID,
    message_id: MessageID,
    content: RichText,
    creator: SocialID,
    created: Date,
}

export interface ReactionDb {
    workspace_id: WorkspaceID,
    card_id: CardID,
    message_id: MessageID,
    reaction: string,
    creator: SocialID
    created: Date
}

export interface AttachmentDb {
    message_id: MessageID,
    card_id: CardID,
    creator: SocialID
    created: Date
}

export interface NotificationDb {
    message_id: MessageID,
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

export function toMessage(raw: RawMessage): Message {
    const lastPatch = raw.patches?.[0]
    return {
        id: raw.id,
        card: raw.card_id,
        content: lastPatch?.content ?? raw.content,
        creator: raw.creator,
        created: new Date(raw.created),
        edited: lastPatch?.created ? new Date(lastPatch.created) : undefined,
        reactions: (raw.reactions ?? []).map(toReaction),
        attachments: (raw.attachments ?? []).map(toAttachment)
    }
}

export function toReaction(raw: ReactionDb): Reaction {
    return {
        message: raw.message_id,
        reaction: raw.reaction,
        creator: raw.creator,
        created: new Date(raw.created)
    }
}

export function toAttachment(raw: AttachmentDb): Attachment {
    return {
        message: raw.message_id,
        card: raw.card_id,
        creator: raw.creator,
        created: new Date(raw.created)
    }
}

export function toMessagesGroup(raw: MessagesGroupDb): MessagesGroup {
    return {
        card: raw.card_id,
        blobId: raw.blob_id,
        fromId: raw.from_id,
        toId: raw.to_id,
        fromDate: new Date(raw.from_date),
        toDate: new Date(raw.to_date),
        count: raw.count
    }
}