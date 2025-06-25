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

import { type Builder } from '@hcengineering/model'
import view, { createAction } from '@hcengineering/model-view'
import card from '@hcengineering/model-card'
import core from '@hcengineering/model-core'
import emoji from '@hcengineering/model-emoji'

import communication from './plugin'

export function buildMessageActions (builder: Builder): void {
  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.AddReaction,
      icon: emoji.icon.Emoji,
      action: communication.messageActionImpl.AddReaction,
      order: 100
    },
    communication.messageAction.AddReaction
  )

  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.ReplyInThread,
      icon: communication.icon.MessageMultiple,
      action: communication.messageActionImpl.ReplyInThread,
      visibilityTester: communication.function.CanReplyInThread,
      order: 200
    },
    communication.messageAction.ReplyInThread
  )

  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.CreateCard,
      icon: card.icon.Card,
      action: communication.messageActionImpl.CreateCard,
      visibilityTester: communication.function.CanCreateCard,
      order: 300
    },
    communication.messageAction.CreateCard
  )

  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.TranslateMessage,
      icon: view.icon.Translate,
      action: communication.messageActionImpl.TranslateMessage,
      visibilityTester: communication.function.CanTranslateMessage,
      order: 400
    },
    communication.messageAction.TranslateMessage
  )

  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.ShowOriginalMessage,
      icon: view.icon.Undo,
      action: communication.messageActionImpl.ShowOriginalMessage,
      visibilityTester: communication.function.CanShowOriginalMessage,
      order: 400
    },
    communication.messageAction.ShowOriginalMessage
  )

  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.EditMessage,
      icon: view.icon.Edit,
      action: communication.messageActionImpl.EditMessage,
      order: 500,
      visibilityTester: communication.function.CanEditMessage,
      menu: true
    },
    communication.messageAction.EditMessage
  )

  builder.createDoc(
    communication.class.MessageAction,
    core.space.Model,
    {
      label: communication.string.RemoveMessage,
      icon: view.icon.Delete,
      action: communication.messageActionImpl.RemoveMessage,
      order: 9999,
      visibilityTester: communication.function.CanRemoveMessage,
      menu: true
    },
    communication.messageAction.RemoveMessage
  )
}

export function buildCardActions (builder: Builder): void {
  createAction(builder, {
    action: communication.action.Subscribe,
    label: communication.string.Subscribe,
    icon: communication.icon.Bell,
    visibilityTester: communication.function.CanSubscribe,
    input: 'focus',
    category: card.category.Card,
    target: card.class.Card,
    context: {
      mode: ['context'],
      group: 'associate'
    }
  })

  createAction(builder, {
    action: communication.action.Unsubscribe,
    label: communication.string.Unsubscribe,
    icon: communication.icon.BellCrossed,
    visibilityTester: communication.function.CanUnsubscribe,
    input: 'focus',
    category: card.category.Card,
    target: card.class.Card,
    context: {
      mode: ['context'],
      group: 'associate'
    }
  })
}
