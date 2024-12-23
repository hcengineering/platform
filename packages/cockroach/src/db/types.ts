import type {CardID, ContextID, MessageID, RichText, SocialID } from "@communication/types"

export enum TableName {
    Message = 'message',
    Patch = 'patch',
    MessagePlace = 'message_place',
    Attachment = 'attachment',
    Reaction = 'reaction',
    Notification = 'notification',
    NotificationContext = 'notification_context'
}

export interface MessageDb {
    content: RichText,
    creator: SocialID,
    created: Date,
}

export interface PatchDb {
    message_id: MessageID,
    content: RichText,
    creator: SocialID,
    created: Date,
}

export interface MessagePlaceDb {
    workspace_id: string,
    card_id: CardID,
    message_id: MessageID
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
    context: ContextID
}

export interface ContextDb {
    workspace_id: string
    card_id: CardID
    person_workspace: string

    archived_from?: Date
    last_view?: Date
    last_update?: Date
}