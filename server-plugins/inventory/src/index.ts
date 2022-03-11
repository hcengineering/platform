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

import type { Resource, Plugin } from '@anticrm/platform'
import { plugin } from '@anticrm/platform'
import { Doc } from '@anticrm/core'
import { TriggerFunc } from '@anticrm/server-core'

/**
 * @public
 */
export const serverInventoryId = 'server-inventory' as Plugin

/**
 * @public
 */
export default plugin(serverInventoryId, {
  trigger: {
    OnProductCreate: '' as Resource<TriggerFunc>,
    OnProductUpdate: '' as Resource<TriggerFunc>
  },
  function: {
    ProductHTMLPresenter: '' as Resource<(doc: Doc) => string>,
    ProductTextPresenter: '' as Resource<(doc: Doc) => string>
  }
})
