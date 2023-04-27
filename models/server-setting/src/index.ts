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

import { Builder } from '@hcengineering/model'

import core from '@hcengineering/core'
import serverNotification from '@hcengineering/server-notification'
import serverSetting from '@hcengineering/server-setting'
import setting from '@hcengineering/setting'

export { serverSettingId } from '@hcengineering/server-setting'

export function createModel (builder: Builder): void {
  builder.mixin(setting.class.Integration, core.class.Class, serverNotification.mixin.HTMLPresenter, {
    presenter: serverSetting.function.IntegrationHTMLPresenter
  })

  builder.mixin(setting.class.Integration, core.class.Class, serverNotification.mixin.TextPresenter, {
    presenter: serverSetting.function.IntegrationTextPresenter
  })
}
