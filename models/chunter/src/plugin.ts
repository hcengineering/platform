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

import type { DisplayTx, TxViewlet } from '@hcengineering/activity'
import { Channel, chunterId } from '@hcengineering/chunter'
import chunter from '@hcengineering/chunter-resources/src/plugin'
import type { Doc, Ref, Space } from '@hcengineering/core'
import { NotificationGroup } from '@hcengineering/notification'
import type { IntlString, Resource } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import type { AnyComponent, Location } from '@hcengineering/ui'
import type { Action, ActionCategory, ViewAction, ViewletDescriptor } from '@hcengineering/view'

export default mergeIds(chunterId, chunter, {
  component: {
    CommentPresenter: '' as AnyComponent,
    ChannelPresenter: '' as AnyComponent,
    DirectMessagePresenter: '' as AnyComponent,
    MessagePresenter: '' as AnyComponent,
    DmPresenter: '' as AnyComponent,
    Threads: '' as AnyComponent,
    SavedMessages: '' as AnyComponent,
    ChunterBrowser: '' as AnyComponent
  },
  action: {
    MarkCommentUnread: '' as Ref<Action>,
    MarkUnread: '' as Ref<Action>,
    ArchiveChannel: '' as Ref<Action>,
    UnarchiveChannel: '' as Ref<Action>,
    ConvertToPrivate: '' as Ref<Action>,
    CopyCommentLink: '' as Ref<Action>,
    CopyThreadMessageLink: '' as Ref<Action>,
    CopyMessageLink: '' as Ref<Action>
  },
  actionImpl: {
    MarkUnread: '' as ViewAction,
    MarkCommentUnread: '' as ViewAction,
    ArchiveChannel: '' as ViewAction,
    UnarchiveChannel: '' as ViewAction,
    ConvertDmToPrivateChannel: '' as ViewAction
  },
  category: {
    Chunter: '' as Ref<ActionCategory>
  },
  string: {
    ApplicationLabelChunter: '' as IntlString,
    LeftComment: '' as IntlString,
    MentionedIn: '' as IntlString,
    Content: '' as IntlString,
    Comment: '' as IntlString,
    Reference: '' as IntlString,
    Chat: '' as IntlString,
    CreateBy: '' as IntlString,
    Create: '' as IntlString,
    Edit: '' as IntlString,
    MarkUnread: '' as IntlString,
    LastMessage: '' as IntlString,
    MentionNotification: '' as IntlString,
    PinnedMessages: '' as IntlString,
    SavedMessages: '' as IntlString,
    ThreadMessage: '' as IntlString,
    Reactions: '' as IntlString,
    Emoji: '' as IntlString,
    FilterComments: '' as IntlString,
    FilterBacklinks: '' as IntlString,
    DM: '' as IntlString,
    DMNotification: '' as IntlString,
    ConfigLabel: '' as IntlString,
    ConfigDescription: '' as IntlString
  },
  viewlet: {
    Chat: '' as Ref<ViewletDescriptor>
  },
  ids: {
    TxCommentCreate: '' as Ref<TxViewlet>,
    TxBacklinkCreate: '' as Ref<TxViewlet>,
    TxCommentRemove: '' as Ref<TxViewlet>,
    TxBacklinkRemove: '' as Ref<TxViewlet>,
    TxMessageCreate: '' as Ref<TxViewlet>,
    ChunterNotificationGroup: '' as Ref<NotificationGroup>
  },
  activity: {
    TxCommentCreate: '' as AnyComponent,
    TxBacklinkCreate: '' as AnyComponent,
    TxBacklinkReference: '' as AnyComponent,
    TxMessageCreate: '' as AnyComponent
  },
  space: {
    General: '' as Ref<Channel>,
    Random: '' as Ref<Channel>
  },
  function: {
    ChunterBrowserVisible: '' as Resource<(spaces: Space[]) => Promise<boolean>>,
    GetLink: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<string>>,
    GetFragment: '' as Resource<(doc: Doc, props: Record<string, any>) => Promise<Location>>
  },
  filter: {
    CommentsFilter: '' as Resource<(tx: DisplayTx, _class?: Ref<Doc>) => boolean>,
    BacklinksFilter: '' as Resource<(tx: DisplayTx, _class?: Ref<Doc>) => boolean>
  }
})
