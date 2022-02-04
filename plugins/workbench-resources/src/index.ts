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

import WorkbenchApp from './components/WorkbenchApp.svelte'
import ApplicationPresenter from './components/ApplicationPresenter.svelte'
import { Resources } from '@anticrm/platform'
import Archive from './components/Archive.svelte'
import { Space } from '@anticrm/core'
import SpacePanel from './components/navigator/SpacePanel.svelte'

function hasArchiveSpaces (spaces: Space[]): boolean {
  return spaces.find(sp => sp.archived) !== undefined
}

export default async (): Promise<Resources> => ({
  component: {
    WorkbenchApp,
    ApplicationPresenter,
    Archive,
    SpacePanel
  },
  function: {
    HasArchiveSpaces: hasArchiveSpaces
  }
})
