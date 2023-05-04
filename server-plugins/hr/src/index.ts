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

import type { Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { TriggerFunc } from '@hcengineering/server-core'
import { Presenter } from '@hcengineering/server-notification'

/**
 * @public
 */
export const serverHrId = 'server-hr' as Plugin

/**
 * @public
 */
export default plugin(serverHrId, {
  trigger: {
    OnDepartmentStaff: '' as Resource<TriggerFunc>,
    OnDepartmentRemove: '' as Resource<TriggerFunc>,
    OnRequestCreate: '' as Resource<TriggerFunc>,
    OnRequestUpdate: '' as Resource<TriggerFunc>,
    OnRequestRemove: '' as Resource<TriggerFunc>,
    OnPublicHolidayCreate: '' as Resource<TriggerFunc>
  },
  function: {
    RequestHTMLPresenter: '' as Resource<Presenter>,
    RequestTextPresenter: '' as Resource<Presenter>,
    PublicHolidayHTMLPresenter: '' as Resource<Presenter>,
    PublicHolidayTextPresenter: '' as Resource<Presenter>
  }
})
