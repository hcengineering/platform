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

import { type Builder } from '@hcengineering/model'

import core, { type Class, type Doc } from '@hcengineering/core'
import drive from '@hcengineering/drive'
import serverCore, { type ObjectDDParticipant } from '@hcengineering/server-core'
import serverDrive from '@hcengineering/server-drive'

export { serverDriveId } from '@hcengineering/server-drive'

export function createModel (builder: Builder): void {
  builder.createDoc(serverCore.class.Trigger, core.space.Model, {
    trigger: serverDrive.trigger.OnFileVersionDelete,
    txMatch: {
      _class: core.class.TxRemoveDoc,
      objectClass: drive.class.FileVersion
    }
  })

  builder.mixin<Class<Doc>, ObjectDDParticipant>(
    drive.class.Folder,
    core.class.Class,
    serverCore.mixin.ObjectDDParticipant,
    {
      collectDocs: serverDrive.function.FindFolderResources
    }
  )

  builder.mixin(drive.class.File, core.class.Class, serverCore.mixin.SearchPresenter, {
    searchIcon: drive.icon.File,
    title: [['title']]
  })

  builder.mixin(drive.class.Folder, core.class.Class, serverCore.mixin.SearchPresenter, {
    searchIcon: drive.icon.Folder,
    title: [['title']]
  })
}
