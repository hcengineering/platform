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

import { Ref } from '@hcengineering/core'
import { plugin, IntlString, type Plugin, Asset, Resource } from '@hcengineering/platform'
import { MasterTag } from '@hcengineering/card'
import { Widget, WidgetTab } from '@hcengineering/workbench'

export const chatId = 'chat' as Plugin

const chat = plugin(chatId, {
  string: {
    Channel: '' as IntlString,
    Channels: '' as IntlString,
    Chat: '' as IntlString,
    Description: '' as IntlString,
    MessageIn: '' as IntlString,
    Thread: '' as IntlString,
    Threads: '' as IntlString,
    Title: '' as IntlString
  },
  icon: {
    Channel: '' as Asset,
    ChatBubble: '' as Asset,
    Thread: '' as Asset
  },
  masterTag: {
    Channel: '' as Ref<MasterTag>,
    Thread: '' as Ref<MasterTag>
  },
  ids: {
    ChatWidget: '' as Ref<Widget>
  },
  function: {
    CloseChatWidgetTab: '' as Resource<(tab: WidgetTab) => Promise<void>>
  }
})

export default chat
