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

import { type Resources } from '@hcengineering/platform'

import CardMessagesSection from './components/CardMessagesSection.svelte'
import PollPresenter from './components/poll/PollPresenter.svelte'
import CreatePoll from './components/poll/CreatePoll.svelte'
import PollPreview from './components/poll/PollPreview.svelte'
import UserVoteActivityPresenter from './components/poll/UserVoteActivityPresenter.svelte'
import UserVotesPresenter from './components/poll/UserVotesPresenter.svelte'
import DirectIcon from './components/DirectIcon.svelte'
import CreateDirect from './components/CreateDirect.svelte'

import { unsubscribe, subscribe, canSubscribe, canUnsubscribe, canCreateDirect } from './utils'
import {
  addReaction,
  canCreateCard,
  canEditMessage,
  canRemoveMessage,
  canReplyInThread,
  canShowOriginalMessage,
  canTranslateMessage,
  createCard,
  editMessage,
  removeMessage,
  replyInThread,
  showOriginalMessage,
  translateMessage
} from './actions'
import { createPoll, getPollTitle } from './poll'

export { isActivityMessage } from './activity'
export * from './stores'
export { defaultMessageInputActions } from './utils'

export { default as MessagePresenter } from './components/message/MessagePresenter.svelte'
export { default as MessageInput } from './components/message/MessageInput.svelte'
export { default as ActivityMessageViewer } from './components/message/ActivityMessageViewer.svelte'
export { default as AttachmentsPreview } from './components/AttachmentsPreview.svelte'
export { default as MessagePreview } from './components/MessagePreview.svelte'

export default async (): Promise<Resources> => ({
  component: {
    CardMessagesSection,
    DirectIcon,
    CreateDirect
  },
  poll: {
    PollPresenter,
    CreatePoll,
    PollPreview,
    CreatePollFn: createPoll,
    GetPollTitleFn: getPollTitle,
    UserVoteActivityPresenter,
    UserVotesPresenter
  },
  messageActionImpl: {
    AddReaction: addReaction,
    ReplyInThread: replyInThread,
    TranslateMessage: translateMessage,
    ShowOriginalMessage: showOriginalMessage,
    EditMessage: editMessage,
    RemoveMessage: removeMessage,
    CreateCard: createCard
  },
  action: {
    Unsubscribe: unsubscribe,
    Subscribe: subscribe
  },
  function: {
    CanSubscribe: canSubscribe,
    CanUnsubscribe: canUnsubscribe,
    CanReplyInThread: canReplyInThread,
    CanTranslateMessage: canTranslateMessage,
    CanShowOriginalMessage: canShowOriginalMessage,
    CanEditMessage: canEditMessage,
    CanRemoveMessage: canRemoveMessage,
    CanCreateCard: canCreateCard,
    CanCreateDirect: canCreateDirect
  }
})
