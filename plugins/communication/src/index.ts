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

import { Asset, IntlString, Metadata, plugin, Plugin } from '@hcengineering/platform'
import { CardSection, MasterTag } from '@hcengineering/card'
import { Class, Ref } from '@hcengineering/core'

import { GuestCommunicationSettings, Applet, CustomActivityPresenter, MessageAction, PollAnswer } from './types'

export * from './types'

/**
 * @public
 */
export const communicationId = 'communication' as Plugin

export default plugin(communicationId, {
  class: {
    MessageAction: '' as Ref<Class<MessageAction>>,
    Applet: '' as Ref<Class<Applet>>,
    PollAnswer: '' as Ref<Class<PollAnswer>>,
    CustomActivityPresenter: '' as Ref<Class<CustomActivityPresenter>>,
    GuestCommunicationSettings: '' as Ref<Class<GuestCommunicationSettings>>
  },
  type: {
    Poll: '' as Ref<MasterTag>,
    Direct: '' as Ref<MasterTag>
  },
  icon: {
    Bell: '' as Asset,
    BellCrossed: '' as Asset,
    File: '' as Asset,
    MessageMultiple: '' as Asset,
    Poll: '' as Asset
  },
  metadata: {
    Enabled: '' as Metadata<boolean>
  },
  string: {
    Messages: '' as IntlString,
    FirstMessages: '' as IntlString,
    LatestMessages: '' as IntlString,
    Subscribe: '' as IntlString,
    Unsubscribe: '' as IntlString,
    File: '' as IntlString,
    Files: '' as IntlString,
    CreatePoll: '' as IntlString,
    Poll: '' as IntlString,
    QuestionIsRequired: '' as IntlString,
    AnswerIsRequired: '' as IntlString,
    OptionIsRequired: '' as IntlString,
    StartDateMustBeInTheFuture: '' as IntlString,
    EndDateMustBeInTheFuture: '' as IntlString,
    Question: '' as IntlString,
    AskQuestion: '' as IntlString,
    PollOptions: '' as IntlString,
    Option: '' as IntlString,
    AnonymousVoting: '' as IntlString,
    MultipleChoice: '' as IntlString,
    QuizMode: '' as IntlString,
    StartTime: '' as IntlString,
    EndTime: '' as IntlString,
    OpenPoll: '' as IntlString,
    RetractVote: '' as IntlString,
    Quiz: '' as IntlString,
    VotesCount: '' as IntlString,
    Vote: '' as IntlString,
    ShowResults: '' as IntlString,
    Ended: '' as IntlString,
    StartsAt: '' as IntlString,
    EndsAt: '' as IntlString,
    StartsTomorrow: '' as IntlString,
    EndsTomorrow: '' as IntlString,
    PollResults: '' as IntlString,
    Polls: '' as IntlString,
    TotalVotes: '' as IntlString,
    Voted: '' as IntlString,
    VotedFor: '' as IntlString,
    RevokedVote: '' as IntlString,
    AnonymousQuiz: '' as IntlString
  },
  ids: {
    CardMessagesSection: '' as Ref<CardSection>,
    PollApplet: '' as Ref<Applet>
  }
})
