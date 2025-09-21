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

import { aiAssistantIntegrationKind } from '@hcengineering/ai-assistant'
import { type Builder } from '@hcengineering/model'
import core from '@hcengineering/model-core'
import setting from '@hcengineering/setting'

import aiAssistant from './plugin'

export { aiAssistantId } from '@hcengineering/ai-assistant'
export { default } from './plugin'

export function createModel (builder: Builder): void {
  builder.createDoc(
    setting.class.IntegrationType,
    core.space.Model,
    {
      label: aiAssistant.string.IntegrationLabel,
      description: aiAssistant.string.IntegrationDescription,
      icon: aiAssistant.component.IconHulyAssistant,
      allowMultiple: false,
      createComponent: aiAssistant.component.Connect,
      configureComponent: aiAssistant.component.Connect,
      onDisconnect: aiAssistant.handler.DisconnectHandler,
      onDisconnectAll: aiAssistant.handler.DisconnectAllHandler,
      reconnectComponent: aiAssistant.component.Connect,
      kind: aiAssistantIntegrationKind
    },
    aiAssistant.integrationType.AiAssistant
  )
}
