//
// Copyright © 2024 Hardcore Engineering Inc.
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

import drive, { type Drive, type Folder } from '@hcengineering/drive'
import { type Resources } from '@hcengineering/platform'

import CreateDrive from './components/CreateDrive.svelte'
import CreateFolder from './components/CreateFolder.svelte'
import { showPopup } from '@hcengineering/ui'

async function createRootFolder (doc: Drive): Promise<void> {
  showPopup(CreateFolder, { space: doc._id, parent: drive.ids.Root })
}

async function createChildFolder (doc: Folder): Promise<void> {
  showPopup(CreateFolder, { space: doc.space, parent: doc._id })
}

async function editDrive (drive: Drive): Promise<void> {
  showPopup(CreateDrive, { drive })
}

export default async (): Promise<Resources> => ({
  component: {
    CreateDrive
  },
  actionImpl: {
    CreateChildFolder: createChildFolder,
    CreateRootFolder: createRootFolder,
    EditDrive: editDrive
  }
})
