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

import { AccountRole, type Space, getCurrentAccount } from '@hcengineering/core'
import { type Resources } from '@hcengineering/platform'
import ApplicationPresenter from './components/ApplicationPresenter.svelte'
import Archive from './components/Archive.svelte'
import SpacePanel from './components/navigator/SpacePanel.svelte'
import SpecialView from './components/SpecialView.svelte'
import WorkbenchApp from './components/WorkbenchApp.svelte'
import { doNavigate } from './utils'
import Workbench from './components/Workbench.svelte'
import ServerManager from './components/ServerManager.svelte'
import WorkbenchTabs from './components/WorkbenchTabs.svelte'
import { isAdminUser } from '@hcengineering/presentation'
import { canCloseTab, closeTab, pinTab, unpinTab } from './workbench'
import { closeWidgetTab, createWidgetTab } from './sidebar'

async function hasArchiveSpaces (spaces: Space[]): Promise<boolean> {
  return spaces.find((sp) => sp.archived) !== undefined
}
export { default as StarredNav } from './components/navigator/StarredNav.svelte'
export { default as NavFooter } from './components/NavFooter.svelte'
export { default as NavHeader } from './components/NavHeader.svelte'
export { default as SpecialElement } from './components/navigator/SpecialElement.svelte'
export { default as SpaceView } from './components/SpaceView.svelte'
export { default as TreeSeparator } from './components/navigator/TreeSeparator.svelte'
export { SpecialView }

export * from './utils'
export * from './sidebar'
export default async (): Promise<Resources> => ({
  component: {
    WorkbenchApp,
    ApplicationPresenter,
    Archive,
    SpacePanel,
    SpecialView,
    Workbench,
    ServerManager,
    WorkbenchTabs
  },
  function: {
    HasArchiveSpaces: hasArchiveSpaces,
    IsOwner: async (docs: Space[]) => getCurrentAccount().role === AccountRole.Owner || isAdminUser(),
    CanCloseTab: canCloseTab,
    CreateWidgetTab: createWidgetTab,
    CloseWidgetTab: closeWidgetTab
  },
  actionImpl: {
    Navigate: doNavigate,
    PinTab: pinTab,
    UnpinTab: unpinTab,
    CloseTab: closeTab
  }
})
