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

import { mergeIds } from '@hcengineering/platform'
import type { IntlString } from '@hcengineering/platform'

import workbench, { workbenchId } from '@hcengineering/workbench'
import { AnyComponent } from '@hcengineering/ui'

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
    BrowseSpaces: '' as IntlString,
    AccountDisabled: '' as IntlString,
    AccountDisabledDescr: '' as IntlString,
    HelpAndSupport: '' as IntlString,
    HelpCenter: '' as IntlString,
    KeyboardShortcuts: '' as IntlString,
    Documentation: '' as IntlString,
    OpenPlatformGuide: '' as IntlString,
    AccessWorkspaceSettings: '' as IntlString,
    HowToWorkFaster: '' as IntlString,
    OpenInNewTab: '' as IntlString,
    NewVersionAvailable: '' as IntlString,
    PleaseUpdate: '' as IntlString,
    ServerUnderMaintenance: '' as IntlString
  },
  component: {
    SpacePanel: '' as AnyComponent,
    Workbench: '' as AnyComponent
  }
})
