//
// Copyright © 2022 Hardcore Engineering Inc.
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

import { type Domain } from '@hcengineering/core'
import {
  gmailIntegrationKind
} from '@hcengineering/gmail'
import {
  type Builder
} from '@hcengineering/model'
import core from '@hcengineering/model-core'
import setting from '@hcengineering/setting'

import gmail from './plugin'

export { gmailId } from '@hcengineering/gmail'
export { default } from './plugin'

export const DOMAIN_GMAIL = 'gmail' as Domain

export function createModel (builder: Builder): void {
  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: gmail.string.IntegrationLabel,
      description: gmail.string.IntegrationDescription,
      icon: gmail.component.IconGmail,
      allowMultiple: true,
      createComponent: gmail.component.Connect,
      onDisconnect: gmail.handler.DisconnectHandler,
      onDisconnectAll: gmail.handler.DisconnectAllHandler,
      reconnectComponent: gmail.component.Connect,
      configureComponent: gmail.component.Configure,
      stateComponent: gmail.component.IntegrationState,
      kind: gmailIntegrationKind
    },
    gmail.integrationType.Gmail
  )
}
