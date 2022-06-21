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
import { automationId } from '@anticrm/automation'
import automation from '@anticrm/automation-resources/src/plugin'
import { mergeIds } from '@anticrm/platform'
import { SettingsCategory } from '@anticrm/setting'
import view from 'anticrn/view' // eslint-disable-line @typescript-eslint/no-unused-vars

export default mergeIds(automationId, automation, {
  ids: {
    Automation: '' as Ref<SettingsCategory>
  }
})
