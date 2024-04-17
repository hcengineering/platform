//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { ActivityMessage, ActivityMessageViewlet } from '@hcengineering/activity'
import type { Person } from '@hcengineering/contact'
import type { Account, AttachedDoc, Class, Doc, Markup, Mixin, Ref, Space, Timestamp } from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Asset, Plugin } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { Action } from '@hcengineering/view'

/**
 * @public
 */
export interface ChunterSpace extends Space {
  lastMessage?: Timestamp
  pinned?: Ref<ChunterMessage>[]
}

/**
 * @public
 */
export interface Channel extends ChunterSpace {
  topic?: string
}

/**
 * @public
 */
export interface DirectMessage extends ChunterSpace {}

/**
 * @public
 * @deprecated use ChatMessage instead
 */
export interface ChunterMessage extends AttachedDoc {
  content: Markup
  attachments?: number
  createBy: Ref<Account>
  editedOn?: Timestamp
  reactions?: number
}

/**
 * @public
 */
export interface ChunterMessageExtension extends ChunterMessage {}

/**
 * @public
 * @deprecated use ChatMessage instead
 */
export interface Message extends ChunterMessage {
  attachedTo: Ref<Space>
  attachedToClass: Ref<Class<Space>>
  replies?: Ref<Person>[]
  repliesCount?: number
  lastReply?: Timestamp
}

/**
 * @public
 */
export interface DirectMessageInput extends Class<Doc> {
  component: AnyComponent
}

/**
 * @public
 */
export interface ObjectChatPanel extends Class<Doc> {
  ignoreKeys: string[]
}

/**
 * @public
 */
export interface ChatMessage extends ActivityMessage {
  message: Markup
  attachments?: number
  editedOn?: Timestamp
}

/**
 * @public
 */
export interface ThreadMessage extends ChatMessage {
  attachedTo: Ref<ActivityMessage>
  attachedToClass: Ref<Class<ActivityMessage>>
  objectId: Ref<Doc>
  objectClass: Ref<Class<Doc>>
}

/**
 * @public
 */
export interface ChatMessageViewlet extends ActivityMessageViewlet {
  messageClass: Ref<Class<Doc>>
  label?: IntlString
}

/**
 * @public
 */
export const chunterId = 'chunter' as Plugin

export * from './utils'

export default plugin(chunterId, {
  icon: {
    Chunter: '' as Asset,
    Hashtag: '' as Asset,
    Thread: '' as Asset,
    Lock: '' as Asset,
    ChannelBrowser: '' as Asset,
    Copy: '' as Asset
  },
  component: {
    DmHeader: '' as AnyComponent,
    ThreadView: '' as AnyComponent,
    Thread: '' as AnyComponent,
    Reactions: '' as AnyComponent,
    ChatMessageInput: '' as AnyComponent,
    ChatMessagesPresenter: '' as AnyComponent,
    ChatMessagePresenter: '' as AnyComponent,
    ThreadMessagePresenter: '' as AnyComponent,
    ChatAside: '' as AnyComponent,
    ChatMessagePreview: '' as AnyComponent,
    ThreadMessagePreview: '' as AnyComponent
  },
  class: {
    Message: '' as Ref<Class<Message>>,
    ChunterMessage: '' as Ref<Class<ChunterMessage>>,
    ThreadMessage: '' as Ref<Class<ThreadMessage>>,
    ChunterSpace: '' as Ref<Class<ChunterSpace>>,
    Channel: '' as Ref<Class<Channel>>,
    DirectMessage: '' as Ref<Class<DirectMessage>>,
    ChatMessage: '' as Ref<Class<ChatMessage>>,
    ChatMessageViewlet: '' as Ref<Class<ChatMessageViewlet>>
  },
  mixin: {
    DirectMessageInput: '' as Ref<Mixin<DirectMessageInput>>,
    ChunterMessageExtension: '' as Ref<Mixin<ChunterMessageExtension>>,
    ObjectChatPanel: '' as Ref<Mixin<ObjectChatPanel>>
  },
  string: {
    Reactions: '' as IntlString,
    EditUpdate: '' as IntlString,
    EditCancel: '' as IntlString,
    Comments: '' as IntlString,
    Settings: '' as IntlString,
    ArchiveChannel: '' as IntlString,
    UnarchiveChannel: '' as IntlString,
    ArchiveConfirm: '' as IntlString,
    Message: '' as IntlString,
    MessageOn: '' as IntlString,
    UnarchiveConfirm: '' as IntlString,
    ConvertToPrivate: '' as IntlString,
    DirectNotificationTitle: '' as IntlString,
    DirectNotificationBody: '' as IntlString,
    MessageNotificationBody: '' as IntlString,
    AddCommentPlaceholder: '' as IntlString,
    LeftComment: '' as IntlString,
    Docs: '' as IntlString,
    Chat: '' as IntlString,
    Thread: '' as IntlString,
    ThreadMessage: '' as IntlString,
    ReplyToThread: '' as IntlString,
    Channels: '' as IntlString,
    Direct: '' as IntlString,
    RepliedTo: '' as IntlString,
    AllChannels: '' as IntlString,
    AllContacts: '' as IntlString,
    NewChannel: '' as IntlString,
    DescriptionOptional: '' as IntlString,
    Visibility: '' as IntlString,
    Public: '' as IntlString,
    Private: '' as IntlString,
    NewDirectChat: '' as IntlString,
    AddMembers: '' as IntlString,
    CloseConversation: '' as IntlString,
    Starred: '' as IntlString,
    DeleteStarred: '' as IntlString,
    StarChannel: '' as IntlString,
    StarConversation: '' as IntlString,
    UnstarChannel: '' as IntlString,
    UnstarConversation: '' as IntlString
  },
  ids: {
    DMNotification: '' as Ref<NotificationType>,
    ThreadNotification: '' as Ref<NotificationType>,
    ChannelNotification: '' as Ref<NotificationType>,
    ThreadMessageViewlet: '' as Ref<ChatMessageViewlet>
  },
  app: {
    Chunter: '' as Ref<Doc>
  },
  action: {
    DeleteChatMessage: '' as Ref<Action>,
    LeaveChannel: '' as Ref<Action>,
    RemoveChannel: '' as Ref<Action>,
    CloseConversation: '' as Ref<Action>
  }
})
