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
    card_id: string,
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