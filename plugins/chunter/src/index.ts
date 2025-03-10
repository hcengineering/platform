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
import type { Class, Doc, Markup, Mixin, Ref, Space, Timestamp } from '@hcengineering/core'
import { NotificationType } from '@hcengineering/notification'
import type { Asset, Plugin, Resource } from '@hcengineering/platform'
import { IntlString, plugin } from '@hcengineering/platform'
import { AnyComponent } from '@hcengineering/ui'
import { Action } from '@hcengineering/view'
import { Person, ChannelProvider as SocialChannelProvider } from '@hcengineering/contact'
import { Widget, WidgetTab } from '@hcengineering/workbench'

/**
 * @public
 */
export interface ChunterSpace extends Space {
  messages?: number
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
 */
export interface ObjectChatPanel extends Class<Doc> {
  openByDefault?: boolean
  ignoreKeys: string[]
}

/**
 * @public
 */
export interface ChatMessage extends ActivityMessage {
  message: Markup
  attachments?: number
  editedOn?: Timestamp
  provider?: Ref<SocialChannelProvider>
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

export interface ChatSyncInfo extends Doc {
  user: Ref<Person>
  timestamp: Timestamp
}

export interface ChatWidgetTab extends WidgetTab {
  data: {
    _id?: Ref<Doc>
    _class?: Ref<Class<Doc>>
    thread?: Ref<ActivityMessage>
    channelName: string
    selectedMessageId?: Ref<ActivityMessage>
    props?: Record<string, any>
  }
}

/**
 * @public
 */
export const chunterId = 'chunter' as Plugin

export * from './utils'
export * from './analytics'

export default plugin(chunterId, {
  icon: {
    Chunter: '' as Asset,
    Hashtag: '' as Asset,
    Thread: '' as Asset,
    Lock: '' as Asset,
    ChannelBrowser: '' as Asset,
    ChunterBrowser: '' as Asset,
    Copy: '' as Asset,
    Messages: '' as Asset,
    Bookmarks: '' as Asset
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
    ChatMessagePreview: '' as AnyComponent,
    ThreadMessagePreview: '' as AnyComponent,
    DirectIcon: '' as AnyComponent,
    InlineCommentThread: '' as AnyComponent
  },
  activity: {
    MembersChangedMessage: '' as AnyComponent
  },
  class: {
    ThreadMessage: '' as Ref<Class<ThreadMessage>>,
    ChunterSpace: '' as Ref<Class<ChunterSpace>>,
    Channel: '' as Ref<Class<Channel>>,
    DirectMessage: '' as Ref<Class<DirectMessage>>,
    ChatMessage: '' as Ref<Class<ChatMessage>>,
    ChatMessageViewlet: '' as Ref<Class<ChatMessageViewlet>>,
    ChatSyncInfo: '' as Ref<Class<ChatSyncInfo>>
  },
  mixin: {
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
    UnstarConversation: '' as IntlString,
    NoMessagesInChannel: '' as IntlString,
    SendMessagesInChannel: '' as IntlString,
    Joined: '' as IntlString,
    Left: '' as IntlString,
    Added: '' as IntlString,
    Removed: '' as IntlString,
    CreatedChannelOn: '' as IntlString,
    YouJoinedChannel: '' as IntlString,
    AndMore: '' as IntlString,
    IsTyping: '' as IntlString,
    ThreadIn: '' as IntlString,
    TranslateMessage: '' as IntlString,
    Translate: '' as IntlString,
    ShowOriginal: '' as IntlString,
    Translating: '' as IntlString,
    StartConversation: '' as IntlString,
    ViewingThreadFromArchivedChannel: '' as IntlString,
    ViewingArchivedChannel: '' as IntlString,
    OpenChatInSidebar: '' as IntlString,
    SummarizeMessages: '' as IntlString
  },
  ids: {
    DMNotification: '' as Ref<NotificationType>,
    ThreadNotification: '' as Ref<NotificationType>,
    ChannelNotification: '' as Ref<NotificationType>,
    JoinChannelNotification: '' as Ref<NotificationType>,
    ThreadMessageViewlet: '' as Ref<ChatMessageViewlet>,
    ChatWidget: '' as Ref<Widget>
  },
  app: {
    Chunter: '' as Ref<Doc>
  },
  action: {
    DeleteChatMessage: '' as Ref<Action>,
    LeaveChannel: '' as Ref<Action>,
    RemoveChannel: '' as Ref<Action>,
    TranslateMessage: '' as Ref<Action>,
    SummarizeMessages: '' as Ref<Action>,
    ShowOriginalMessage: '' as Ref<Action>,
    CloseConversation: '' as Ref<Action>
  },
  function: {
    CanTranslateMessage: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanSummarizeMessages: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    OpenThreadInSidebar: '' as Resource<
    (
      _id: Ref<ActivityMessage>,
      msg?: ActivityMessage,
      doc?: Doc,
      selectedId?: Ref<ActivityMessage>,
      props?: Record<string, any>
    ) => Promise<void>
    >,
    OpenChannelInSidebar: '' as Resource<
    (
      _id: Ref<Doc>,
      _class: Ref<Class<Doc>>,
      doc?: Doc,
      thread?: Ref<ActivityMessage>,
      newTab?: boolean,
      selectedMessageId?: Ref<ActivityMessage>
    ) => Promise<void>
    >
  }
})
