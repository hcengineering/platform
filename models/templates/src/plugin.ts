//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
import { mergeIds, Resource } from '@anticrm/platform'
import { SettingsCategory } from '@anticrm/setting'
import { templatesId } from '@anticrm/templates'
import templates from '@anticrm/templates-resources/src/plugin'

import type { AnyComponent } from '@anticrm/ui'
import { RefInputAction, RefInputActionItem } from '@anticrm/model-text-editor'

export default mergeIds(templatesId, templates, {
  ids: {
    Templates: '' as Ref<SettingsCategory>,
    TemplatePopupAction: '' as Ref<RefInputActionItem>
  },

  // Without it, CLI version is failed with some svelte dependency exception.
  componnets: {
    Dummy: '' as AnyComponent
  },
  action: {
    ShowTemplates: '' as Resource<RefInputAction>
  }
})
