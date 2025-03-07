//
// Copyright © 2024-2025 Hardcore Engineering Inc.
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
import core from '@hcengineering/model-core'
import presentation from '@hcengineering/model-presentation'
import workbench from '@hcengineering/model-workbench'

import { TUploadHandler } from './models'
import uploader from './plugin'

export { uploaderId } from '@hcengineering/uploader'
export { uploader as default }

export function createModel (builder: Builder): void {
  builder.createModel(TUploadHandler)
  builder.createDoc(presentation.class.ComponentPointExtension, core.space.Model, {
    extension: workbench.extensions.WorkbenchExtensions,
    component: uploader.component.WorkbenchExtension
  })
  builder.createDoc(uploader.class.UploadHandlerDefinition, core.space.Model, {
    handler: uploader.function.UploadFilesHandler,
    label: uploader.string.UploadFiles,
    icon: uploader.icon.UploadFilesIcon
  })
  builder.createDoc(uploader.class.UploadHandlerDefinition, core.space.Model, {
    handler: uploader.function.UploadFoldersHandler,
    label: uploader.string.UploadFolders,
    icon: uploader.icon.UploadFoldersIcon
  })
}
