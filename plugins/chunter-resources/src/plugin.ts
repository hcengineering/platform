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

import chunter, { chunterId } from '@hcengineering/chunter'
import type { Client, Doc, Ref, Space } from '@hcengineering/core'
import type { IntlString, Resource } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import { type ViewAction } from '@hcengineering/view'
import { type DocNotifyContext, type InboxNotification } from '@hcengineering/notification'

export default mergeIds(chunterId, chunter, {
  component: {
    CreateChannel: '' as AnyComponent,
    CreateDirectChat: '' as AnyComponent,
    ChannelHeader: '' as AnyComponent,
    ChannelPanel: '' as AnyComponent,
    ThreadViewPanel: '' as AnyComponent,
    ThreadParentPresenter: '' as AnyComponent,
    EditChannel: '' as AnyComponent,
    ChannelPreview: '' as AnyComponent,
    MessagePreview: '' as AnyComponent,
    DirectMessageInput: '' as AnyComponent,
    CreateDocChannel: '' as AnyComponent,
    SavedMessages: '' as AnyComponent,
    Threads: '' as AnyComponent,
    ChunterBrowser: '' as AnyComponent,
    DirectIcon: '' as AnyComponent,
    ChannelIcon: '' as AnyComponent
  },
  function: {
    GetDmName: '' as Resource<(client: Client, space: Space) => Promise<string>>,
    DirectTitleProvider: '' as Resource<(client: Client, id: Ref<Doc>) => Promise<string>>,
    ChannelTitleProvider: '' as Resource<(client: Client, id: Ref<Doc>) => Promise<string>>,
    ChunterBrowserVisible: '' as Resource<(spaces: Space[]) => Promise<boolean>>,
    GetUnreadThreadsCount: '' as Resource<
    (inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>) => number
    >
  },
  actionImpl: {
    SubscribeMessage: '' as ViewAction,
    UnsubscribeMessage: '' as ViewAction,
    SubscribeComment: '' as ViewAction,
    UnsubscribeComment: '' as ViewAction,
    LeaveChannel: '' as ViewAction,
    RemoveChannel: '' as ViewAction
  },
  string: {
    Channel: '' as IntlString,
    DirectMessage: '' as IntlString,
    DirectMessages: '' as IntlString,
    CreateChannel: '' as IntlString,
    NewDirectMessage: '' as IntlString,
    ChannelName: '' as IntlString,
    ChannelNamePlaceholder: '' as IntlString,
    ChannelDescription: '' as IntlString,
    About: '' as IntlString,
    Members: '' as IntlString,
    NoMembers: '' as IntlString,
    In: '' as IntlString,
    Replies: '' as IntlString,
    Topic: '' as IntlString,
    Threads: '' as IntlString,
    New: '' as IntlString,
    GetNewReplies: '' as IntlString,
    TurnOffReplies: '' as IntlString,
    PinMessage: '' as IntlString,
    UnpinMessage: '' as IntlString,
    Pinned: '' as IntlString,
    DeleteMessage: '' as IntlString,
    EditMessage: '' as IntlString,
    Edited: '' as IntlString,
    AndYou: '' as IntlString,
    ShowMoreReplies: '' as IntlString,
    AddToSaved: '' as IntlString,
    RemoveFromSaved: '' as IntlString,
    EmptySavedHeader: '' as IntlString,
    EmptySavedText: '' as IntlString,
    SharedBy: '' as IntlString,
    LeaveChannel: '' as IntlString,
    ChannelBrowser: '' as IntlString,
    Saved: '' as IntlString,
    MessagesBrowser: '' as IntlString,
    ChunterBrowser: '' as IntlString,
    Messages: '' as IntlString,
    NoResults: '' as IntlString,
    CopyLink: '' as IntlString,
    You: '' as IntlString,
    YouHaveJoinedTheConversation: '' as IntlString,
    NoMessages: '' as IntlString,
    On: '' as IntlString,
    Mentioned: '' as IntlString,
    SentMessage: '' as IntlString,
    PinnedCount: '' as IntlString,
    LoadingHistory: '' as IntlString,
    UnpinChannels: '' as IntlString,
    ArchiveActivityConfirmationTitle: '' as IntlString,
    ArchiveActivityConfirmationMessage: '' as IntlString
  }
})
