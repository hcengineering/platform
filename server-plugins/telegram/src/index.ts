//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import { Metadata, Plugin, Resource, plugin } from '@hcengineering/platform'
import { ObjectDDParticipantFunc, TriggerFunc } from '@hcengineering/server-core'
import { TypeMatchFunc } from '@hcengineering/server-notification'
import { TemplateFieldServerFunc } from '@hcengineering/server-templates'

/**
 * @public
 */
export const serverTelegramId = 'server-telegram' as Plugin

/**
 * @public
 */
export default plugin(serverTelegramId, {
  metadata: {
    BotUrl: '' as Metadata<string>
  },
  trigger: {
    OnMessageCreate: '' as Resource<TriggerFunc>,
    NotificationsHandler: '' as Resource<TriggerFunc>
  },
  function: {
    IsIncomingMessageTypeMatch: '' as TypeMatchFunc,
    FindMessages: '' as Resource<ObjectDDParticipantFunc>,
    GetCurrentEmployeeTG: '' as Resource<TemplateFieldServerFunc>,
    GetIntegrationOwnerTG: '' as Resource<TemplateFieldServerFunc>,
  }
})
