//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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

import { plugin } from '@anticrm/platform'
import type { Plugin } from '@anticrm/platform'
import type { Doc, Ref, Class, Space, AttachedDoc } from '@anticrm/core'
import type { AnyComponent } from '@anticrm/ui'
import type { IntegrationType, Handler } from '@anticrm/setting'

/**
 * @public
 */
export interface TelegramMessage extends Doc {
  content: string
  incoming: boolean
  contactPhone?: string
  contactUserName?: string
}

/**
 * @public
 */
export interface SharedTelegramMessage extends Doc {
  content: string
  incoming: boolean
  sender: string
}

/**
 * @public
 */
export interface SharedTelegramMessages extends AttachedDoc {
  messages: SharedTelegramMessage[]
}

/**
 * @public
 */
export const telegramId = 'telegram' as Plugin

export default plugin(telegramId, {
  component: {
    Chat: '' as AnyComponent,
    Connect: '' as AnyComponent,
    IconTelegram: '' as AnyComponent
  },
  integrationType: {
    Telegram: '' as Ref<IntegrationType>
  },
  handler: {
    DisconnectHandler: '' as Handler
  },
  class: {
    Message: '' as Ref<Class<TelegramMessage>>,
    SharedMessages: '' as Ref<Class<SharedTelegramMessages>>
  },
  space: {
    Telegram: '' as Ref<Space>
  }
})
