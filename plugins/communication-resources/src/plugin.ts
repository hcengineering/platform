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

import { type IntlString, mergeIds } from '@hcengineering/platform'
import communication, {
  communicationId,
  type MessageAction,
  type MessageActionFunctionResource,
  type MessageActionVisibilityTesterResource,
  type AppletCreateFnResource,
  type AppletGetTitleFnResource
} from '@hcengineering/communication'
import { type AnyComponent } from '@hcengineering/ui'
import { type Ref } from '@hcengineering/core'
import { type CanCreateCardResource } from '@hcengineering/card'

export default mergeIds(communicationId, communication, {
  component: {
    CardMessagesSection: '' as AnyComponent,
    DirectIcon: '' as AnyComponent,
    CreateDirect: '' as AnyComponent
  },
  poll: {
    PollPresenter: '' as AnyComponent,
    CreatePoll: '' as AnyComponent,
    PollPreview: '' as AnyComponent,
    CreatePollFn: '' as AppletCreateFnResource,
    GetPollTitleFn: '' as AppletGetTitleFnResource,
    UserVoteActivityPresenter: '' as AnyComponent,
    UserVotesPresenter: '' as AnyComponent
  },
  string: {
    Added: '' as IntlString,
    All: '' as IntlString,
    Attach: '' as IntlString,
    Cancel: '' as IntlString,
    Edit: '' as IntlString,
    Edited: '' as IntlString,
    Emoji: '' as IntlString,
    HoursAgo: '' as IntlString,
    JustNow: '' as IntlString,
    LastReply: '' as IntlString,
    Mention: '' as IntlString,
    MinutesAgo: '' as IntlString,
    MonthAt: '' as IntlString,
    New: '' as IntlString,
    Removed: '' as IntlString,
    RepliesCount: '' as IntlString,
    Reply: '' as IntlString,
    Send: '' as IntlString,
    Set: '' as IntlString,
    ShowFormatting: '' as IntlString,
    To: '' as IntlString,
    Today: '' as IntlString,
    Unset: '' as IntlString,
    WeekdayAt: '' as IntlString,
    YearAt: '' as IntlString,
    Yesterday: '' as IntlString,
    YesterdayAt: '' as IntlString,
    AndMore: '' as IntlString,
    IsTyping: '' as IntlString,
    Loading: '' as IntlString,
    MessageIn: '' as IntlString,
    ThreadWasRemoved: '' as IntlString,
    MessageWasRemoved: '' as IntlString,
    JoinedThe: '' as IntlString,
    LeftThe: '' as IntlString,
    Translating: '' as IntlString,
    ShowOriginal: '' as IntlString,
    AddReaction: '' as IntlString,
    ReplyInThread: '' as IntlString,
    TranslateMessage: '' as IntlString,
    ShowOriginalMessage: '' as IntlString,
    EditMessage: '' as IntlString,
    RemoveMessage: '' as IntlString,
    CreateCard: '' as IntlString,
    MessageAlreadyHasCardAttached: '' as IntlString,
    Direct: '' as IntlString,
    Directs: '' as IntlString,
    Members: '' as IntlString
  },
  messageActionImpl: {
    AddReaction: '' as MessageActionFunctionResource,
    ReplyInThread: '' as MessageActionFunctionResource,
    TranslateMessage: '' as MessageActionFunctionResource,
    ShowOriginalMessage: '' as MessageActionFunctionResource,
    EditMessage: '' as MessageActionFunctionResource,
    RemoveMessage: '' as MessageActionFunctionResource,
    CreateCard: '' as MessageActionFunctionResource
  },
  messageAction: {
    AddReaction: '' as Ref<MessageAction>,
    ReplyInThread: '' as Ref<MessageAction>,
    TranslateMessage: '' as Ref<MessageAction>,
    ShowOriginalMessage: '' as Ref<MessageAction>,
    EditMessage: '' as Ref<MessageAction>,
    RemoveMessage: '' as Ref<MessageAction>,
    CreateCard: '' as Ref<MessageAction>
  },
  function: {
    CanReplyInThread: '' as MessageActionVisibilityTesterResource,
    CanTranslateMessage: '' as MessageActionVisibilityTesterResource,
    CanShowOriginalMessage: '' as MessageActionVisibilityTesterResource,
    CanEditMessage: '' as MessageActionVisibilityTesterResource,
    CanRemoveMessage: '' as MessageActionVisibilityTesterResource,
    CanCreateCard: '' as MessageActionVisibilityTesterResource,
    CanCreateDirect: '' as CanCreateCardResource
  }
})
