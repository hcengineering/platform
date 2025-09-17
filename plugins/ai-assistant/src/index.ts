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

import type { Ref, IntegrationKind } from '@hcengineering/core'
import { type Plugin, plugin } from '@hcengineering/platform'
import type { Handler, IntegrationType } from '@hcengineering/setting'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export const aiAssistantIntegrationKind = 'ai-assistant' as IntegrationKind

/**
 * @public
 */
export const aiAssistantId = 'ai-assistant' as Plugin

export default plugin(aiAssistantId, {
  component: {
    Connect: '' as AnyComponent,
    IconHulyAssistant: '' as AnyComponent,
    Configure: '' as AnyComponent
  },
  integrationType: {
    AiAssistant: '' as Ref<IntegrationType>
  },
  handler: {
    DisconnectHandler: '' as Handler,
    DisconnectAllHandler: '' as Handler
  }
})
