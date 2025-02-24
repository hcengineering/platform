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

import type { Asset, Metadata, Plugin } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'

/**
 * @public
 */
export const devModelId = 'devmodel' as Plugin

export default plugin(devModelId, {
  icon: {
    Activity: '' as Asset
  },
  component: {
    ModelView: '' as AnyComponent,
    TransactionView: '' as AnyComponent,
    NotificationsView: '' as AnyComponent
  },
  metadata: {
    DevModel: '' as Metadata<any>
  }
})
