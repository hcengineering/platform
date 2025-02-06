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

import { AccountRole, ClassifierKind } from '@hcengineering/core'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import { chatId } from '@hcengineering/chat'
import card from '@hcengineering/card'
import setting from '@hcengineering/setting'
import { createCardTableViewlet } from '@hcengineering/model-card'
import { WidgetType } from '@hcengineering/workbench'


import chat from './plugin'

export { chatId } from '@hcengineering/chat'
export { chatOperation } from './migration'
export default chat

export function createModel (builder: Builder): void {
  builder.createDoc(
    workbench.class.Application,
    core.space.Model,
    {
      label: chat.string.Chat,
      icon: chat.icon.ChatBubble,
      alias: chatId,
      accessLevel: AccountRole.User,
      hidden: false,
      component: chat.component.ChatApplication
    },
    chat.app.Chat
  )

  builder.createDoc(
    workbench.class.Widget,
    core.space.Model,
    {
      label: chat.string.Chat,
      type: WidgetType.Flexible,
      icon: chat.icon.ChatBubble,
      component: chat.component.ChatWidget
    },
    chat.ids.ChatWidget
  )

  builder.createDoc(
    card.class.MasterTag,
    core.space.Model,
    {
      extends: card.class.Card,
      label: chat.string.Thread,
      kind: ClassifierKind.CLASS,
      icon: chat.icon.Thread,
      pluralLabel: chat.string.Threads
    },
    chat.masterTag.Thread
  )

  builder.createDoc(
    card.class.MasterTag,
    core.space.Model,
    {
      extends: card.class.Card,
      label: chat.string.Channel,
      kind: ClassifierKind.CLASS,
      icon: chat.icon.Channel,
      pluralLabel: chat.string.Channels
    },
    chat.masterTag.Channel
  )

  builder.mixin(chat.masterTag.Thread, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  builder.mixin(chat.masterTag.Channel, core.class.Class, setting.mixin.Editable, {
    value: true
  })

  createCardTableViewlet(builder, chat.masterTag.Thread)
  createCardTableViewlet(builder, chat.masterTag.Channel)
}
