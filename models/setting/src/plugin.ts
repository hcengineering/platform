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

import { Ref } from '@anticrm/core'
import { mergeIds } from '@anticrm/platform'
import { settingId } from '@anticrm/setting'
import setting from '@anticrm/setting-resources/src/plugin'
import type { TxViewlet } from '@anticrm/activity'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(settingId, setting, {
  activity: {
    TxIntegrationDisable: '' as AnyComponent,
    TxIntegrationDisableReconnect: '' as AnyComponent
  },
  ids: {
    TxIntegrationDisable: '' as Ref<TxViewlet>
  },
  component: {
    StringTypeEditor: '' as AnyComponent,
    BooleanTypeEditor: '' as AnyComponent,
    NumberTypeEditor: '' as AnyComponent,
    DateTypeEditor: '' as AnyComponent,
    RefEditor: '' as AnyComponent
  }
})
