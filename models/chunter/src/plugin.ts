//
// Copyright © 2020 Anticrm Platform Contributors.
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

import type { ActivityMessage, TxViewlet } from '@hcengineering/activity'
import { chunterId, type Channel } from '@hcengineering/chunter'
import chunter from '@hcengineering/chunter-resources/src/plugin'
import { type Client, type Doc, type Ref } from '@hcengineering/core'
import { type NotificationGroup } from '@hcengineering/notification'
import type { IntlString, Resource } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import type { AnyComponent, Location } from '@hcengineering/ui/src/types'
import type { Action, ActionCategory, ViewAction, ViewletDescriptor } from '@hcengineering/view'

export default mergeIds(chunterId, chunter, {
  component: {
    ChannelPresenter: '' as AnyComponent,
    DirectMessagePresenter: '' as AnyComponent,
    MessagePresenter: '' as AnyComponent,
    DmPresenter: '' as AnyComponent,
    ChannelsPanel: '' as AnyComponent,
    Chat: '' as AnyComponent,
    ChatMessageNotificationLabel: '' as AnyComponent,
    ThreadNotificationPresenter: '' as AnyComponent
  },
  action: {
    MarkCommentUnread: '' as Ref<Action>,
    MarkUnread: '' as Ref<Action>,
    ArchiveChannel: '' as Ref<Action>,
    UnarchiveChannel: '' as Ref<Action>,
    ConvertToPrivate: '' as Ref<Action>,
    CopyChatMessageLink: '' as Ref<Action<Doc, any>>,
    ReplyToThreadAction: '' as Ref<Action>
  },
  actionImpl: {
    ArchiveChannel: '' as ViewAction,
    UnarchiveChannel: '' as ViewAction,
    ConvertDmToPrivateChannel: '' as ViewAction,
    DeleteChatMessage: '' as ViewAction,
    ReplyToThread: '' as ViewAction
  },
  category: {
    Chunter: '' as Ref<ActionCategory>
  },
  string: {
    ApplicationLabelChunter: '' as IntlString,
    MentionedIn: '' as IntlString,
    Content: '' as IntlString,
    Comment: '' as IntlString,
    Reference: '' as IntlString,
    CreateBy: '' as IntlString,
    Create: '' as IntlString,
    Edit: '' as IntlString,
    MarkUnread: '' as IntlString,
    LastMessage: '' as IntlString,
    MentionNotification: '' as IntlString,
    PinnedMessages: '' as IntlString,
    SavedMessages: '' as IntlString,
    Emoji: '' as IntlString,
    DM: '' as IntlString,
    DMNotification: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString,
    Reacted: '' as IntlString,
    RepliedToThread: '' as IntlString
  },
  viewlet: {
    Chat: '' as Ref<ViewletDescriptor>
  },
  ids: {
    TxCommentCreate: '' as Ref<TxViewlet>,
    TxCommentRemove: '' as Ref<TxViewlet>,
    TxMessageCreate: '' as Ref<TxViewlet>,
    TxChatMessageCreate: '' as Ref<TxViewlet>,
    TxChatMessageRemove: '' as Ref<TxViewlet>,
    ChunterNotificationGroup: '' as Ref<NotificationGroup>
  },
  activity: {
    TxCommentCreate: '' as AnyComponent,
    TxMessageCreate: '' as AnyComponent
  },
  space: {
    General: '' as Ref<Channel>,
    Random: '' as Ref<Channel>
  },
  function: {
    GetLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<string>>,
    GetFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    DmIdentifierProvider: '' as Resource<<T extends Doc>(client: Client, ref: Ref<T>, doc?: T) => Promise<string>>,
    CanDeleteMessage: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    CanCopyMessageLink: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    GetChunterSpaceLinkFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    GetThreadLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>,
    ReplyToThread: '' as Resource<(doc: ActivityMessage) => Promise<void>>,
    CanReplyToThread: '' as Resource<(doc?: Doc | Doc[]) => Promise<boolean>>,
    GetMessageLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>
  },
  filter: {
    ChatMessagesFilter: '' as Resource<(message: ActivityMessage, _class?: Ref<Doc>) => boolean>
  }
})
