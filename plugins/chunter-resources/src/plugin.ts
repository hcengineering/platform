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
import type { Client, Space } from '@hcengineering/core'
import type { IntlString, Resource } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import { ViewAction } from '@hcengineering/view'

export default mergeIds(chunterId, chunter, {
  component: {
    CreateChannel: '' as AnyComponent,
    CreateDirectMessage: '' as AnyComponent,
    ChannelHeader: '' as AnyComponent,
    ChannelViewPanel: '' as AnyComponent,
    ThreadViewPanel: '' as AnyComponent,
    ThreadParentPresenter: '' as AnyComponent,
    EditChannel: '' as AnyComponent,
    ChannelPreview: '' as AnyComponent,
    MessagePreview: '' as AnyComponent,
    DirectMessageInput: '' as AnyComponent,
    CommentPanel: '' as AnyComponent
  },
  function: {
    GetDmName: '' as Resource<(client: Client, space: Space) => Promise<string>>
  },
  actionImpl: {
    SubscribeMessage: '' as ViewAction,
    UnsubscribeMessage: '' as ViewAction,
    PinMessage: '' as ViewAction,
    UnpinMessage: '' as ViewAction,
    SubscribeComment: '' as ViewAction,
    UnsubscribeComment: '' as ViewAction
  },
  string: {
    Channel: '' as IntlString,
    DirectMessage: '' as IntlString,
    Channels: '' as IntlString,
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
    Thread: '' as IntlString,
    Threads: '' as IntlString,
    RepliesCount: '' as IntlString,
    LastReply: '' as IntlString,
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
    SavedItems: '' as IntlString,
    MessagesBrowser: '' as IntlString,
    ChunterBrowser: '' as IntlString,
    Messages: '' as IntlString,
    NoResults: '' as IntlString,
    CopyLink: '' as IntlString,
    You: '' as IntlString,
    YouHaveJoinedTheConversation: '' as IntlString,
    NoMessages: '' as IntlString,
    On: '' as IntlString
  }
})
