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

import { mergeIds } from '@anticrm/platform'
import type { IntlString } from '@anticrm/platform'

import workbench, { workbenchId } from '@anticrm/workbench'
import { AnyComponent } from '@anticrm/ui'

export default mergeIds(workbenchId, workbench, {
  string: {
    More: '' as IntlString,
    Delete: '' as IntlString,
    ShowMenu: '' as IntlString,
    HideMenu: '' as IntlString,
    Archive: '' as IntlString,
    Archived: '' as IntlString,
    Open: '' as IntlString,
    General: '' as IntlString,
    Members: '' as IntlString,
    View: '' as IntlString,
    Leave: '' as IntlString,
    Joined: '' as IntlString,
    Join: '' as IntlString,
    BrowseSpaces: '' as IntlString
  },
  component: {
    SpacePanel: '' as AnyComponent
  }
})
