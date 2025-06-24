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
import { unsubscribe, subscribe, canSubscribe, canUnsubscribe } from './utils'
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

export { isActivityMessage } from './activity'
export * from './stores'

export { default as MessagePresenter } from './components/message/MessagePresenter.svelte'
export { default as MessageInput } from './components/message/MessageInput.svelte'
export { default as ActivityMessageViewer } from './components/message/ActivityMessageViewer.svelte'

export default async (): Promise<Resources> => ({
  component: {
    CardMessagesSection
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
    CanCreateCard: canCreateCard
  }
})
