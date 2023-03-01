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

import { Resources } from '@hcengineering/platform'
import Templates from './components/Templates.svelte'
import { TextEditorHandler } from '@hcengineering/text-editor'
import { showPopup } from '@hcengineering/ui'
import TemplatePopup from './components/TemplatePopup.svelte'
import CreateTemplateCategory from './components/CreateTemplateCategory.svelte'
import Move from './components/Move.svelte'
import Copy from './components/Copy.svelte'
import EditGroup from './components/EditGroup.svelte'
import { getTemplateDataProvider } from './utils'

function ShowTemplates (element: HTMLElement, editor: TextEditorHandler): void {
  showPopup(TemplatePopup, { editor }, element)
}

export default async (): Promise<Resources> => ({
  component: {
    Templates,
    CreateTemplateCategory,
    Move,
    Copy,
    EditGroup
  },
  action: {
    ShowTemplates
  },
  function: {
    GetTemplateDataProvider: getTemplateDataProvider
  }
})
