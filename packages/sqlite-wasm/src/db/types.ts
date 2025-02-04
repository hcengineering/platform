import type {CardID, ContextID, MessageID, RichText, SocialID } from "@hcengineering/communication-types"

export enum TableName {
    Message = 'message',
    Patch = 'patch',
    Attachment = 'attachment',
    Reaction = 'reaction',
    Notification = 'notification',
    NotificationContext = 'notification_context'
}

export interface MessageDb {
    id: string
    workspace_id: string,
    thread_id: string,
    content: RichText,
    creator: SocialID,
    created: Date,
}

export interface PatchDb {
    id: string,
    message_id: MessageID,
    content: RichText,
    creator: SocialID,
    created: Date,
}

export interface ReactionDb {
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
    context_id: ContextID
}

export interface ContextDb {
    id: string
    workspace_id: string
    card_id: CardID
    personal_workspace: string

    archived_from?: Date
    last_view?: Date
    last_update?: Date
}