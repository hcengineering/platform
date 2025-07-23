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

import type {
  CreateMessageOptions,
  CreateMessageResult,
  EventResult,
  UpdatePatchOptions,
  Event
} from '@hcengineering/communication-sdk-types'
import type {
  FindMessagesGroupsParams,
  FindMessagesParams,
  Message,
  MessagesGroup,
  FindNotificationsParams,
  FindNotificationContextParams,
  NotificationContext,
  Notification,
  MessageID,
  Markdown,
  SocialID,
  MessageType,
  CardID,
  CardType,
  MessageExtra,
  AttachmentData,
  AttachmentParams,
  AttachmentID
} from '@hcengineering/communication-types'

export interface RestClient {
  findMessages: (params: FindMessagesParams) => Promise<Message[]>
  findMessagesGroups: (params: FindMessagesGroupsParams) => Promise<MessagesGroup[]>
  findNotificationContexts: (params: FindNotificationContextParams) => Promise<NotificationContext[]>
  findNotifications: (params: FindNotificationsParams) => Promise<Notification[]>

  event: (event: Event, socialId: SocialID) => Promise<EventResult>

  createMessage: (
    cardId: CardID,
    cardType: CardType,
    content: Markdown,
    type: MessageType,
    extra: MessageExtra | undefined,
    socialId: SocialID,
    date?: Date,
    messageId?: MessageID,
    options?: CreateMessageOptions
  ) => Promise<CreateMessageResult>
  updateMessage: (
    cardId: CardID,
    messageId: MessageID,
    content: Markdown | undefined,
    extra: MessageExtra | undefined,
    socialId: SocialID,
    date?: Date,
    options?: UpdatePatchOptions
  ) => Promise<void>
  removeMessage: (cardId: CardID, messageId: MessageID, socialId: SocialID, date?: Date) => Promise<void>

  addAttachments: <P extends AttachmentParams>(
    cardId: CardID,
    messageId: MessageID,
    data: AttachmentData<P>[],
    socialId: SocialID,
    date?: Date
  ) => Promise<void>
  removeAttachments: (
    cardId: CardID,
    messageId: MessageID,
    ids: AttachmentID[],
    socialId: SocialID,
    date?: Date
  ) => Promise<void>
  setAttachments: <P extends AttachmentParams>(
    cardId: CardID,
    messageId: MessageID,
    data: AttachmentData<P>[],
    socialId: SocialID,
    date?: Date
  ) => Promise<void>
}
