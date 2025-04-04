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

import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { TriggerFunc } from '@hcengineering/server-core'

/**
 * @public
 */
export const serverCardId = 'server-card' as Plugin

/**
 * @public
 */
export default plugin(serverCardId, {
  trigger: {
    OnAttribute: '' as Resource<TriggerFunc>,
    OnAttributeRemove: '' as Resource<TriggerFunc>,
    OnMasterTagCreate: '' as Resource<TriggerFunc>,
    OnTagRemove: '' as Resource<TriggerFunc>,
    OnMasterTagRemove: '' as Resource<TriggerFunc>,
    OnCardCreate: '' as Resource<TriggerFunc>,
    OnCardUpdate: '' as Resource<TriggerFunc>,
    OnCardTag: '' as Resource<TriggerFunc>,
    OnCardRemove: '' as Resource<TriggerFunc>
  }
})
