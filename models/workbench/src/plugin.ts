//
// Copyright © 2020 Anticrm Platform Contributors.
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

import { type Doc, type Space } from '@hcengineering/core'
import { type IntlString, type Resource, mergeIds } from '@hcengineering/platform'
import { type AnyComponent } from '@hcengineering/ui/src/types'
import { workbenchId } from '@hcengineering/workbench'
import workbench from '@hcengineering/workbench-resources/src/plugin'

export default mergeIds(workbenchId, workbench, {
  component: {
    ApplicationPresenter: '' as AnyComponent,
    SpecialView: '' as AnyComponent,
    ServerManager: '' as AnyComponent
  },
  string: {
    Application: '' as IntlString,
    SpaceBrowser: '' as IntlString,
    HiddenApplication: '' as IntlString
  },
  function: {
    HasArchiveSpaces: '' as Resource<(spaces: Space[]) => Promise<boolean>>,
    IsOwner: '' as Resource<(docs: Doc[]) => Promise<boolean>>
  }
})
