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

import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import workbench from '@hcengineering/model-workbench'
import { chatId } from '@hcengineering/chat'
import { createSystemType } from '@hcengineering/model-card'
import communication, { MessagesNavigationAnchors } from '@hcengineering/communication'
import { PaletteColorIndexes } from '@hcengineering/ui/src/colors'

import chat from './plugin'
import { AccountRole } from '@hcengineering/core'

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
      hidden: false,
      component: chat.component.ChatApplication,
      locationResolver: chat.resolver.Location,
      locationDataResolver: chat.resolver.LocationData,
      type: 'cards',
      position: 'top',
      order: 200
    },
    chat.app.Chat
  )

  // TODO: move types to communication-plugin
  createSystemType(
    builder,
    chat.masterTag.Thread,
    chat.icon.Thread,
    chat.string.Thread,
    chat.string.Threads,
    {
      defaultSection: communication.ids.CardMessagesSection,
      defaultNavigation: MessagesNavigationAnchors.LatestMessages
    },
    PaletteColorIndexes.Houseplant
  )

  builder.mixin(chat.masterTag.Thread, core.class.Class, core.mixin.TxAccessLevel, {
    updateAccessLevel: AccountRole.Guest
  })
}
