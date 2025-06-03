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
import communication, { communicationId } from '@hcengineering/communication'
import { type AnyComponent } from '@hcengineering/ui'

export default mergeIds(communicationId, communication, {
  component: {
    CardMessagesSection: '' as AnyComponent
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
    LeftThe: '' as IntlString
  }
})
