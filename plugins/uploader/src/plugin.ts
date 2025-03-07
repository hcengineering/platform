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

import type { IntlString, Plugin, Resource, Asset } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui/src/types'
import type { Class, Ref } from '@hcengineering/core'
import type {
  GetUploadHandlers,
  UploadFilesFn,
  UploadFilesPopupFn,
  UploadHandlerDefinition,
  UploadHandler
} from './types'

/** @public */
export const uploaderId = 'uploader' as Plugin

export const uploaderPlugin = plugin(uploaderId, {
  icon: {
    UploadFilesIcon: '' as Asset,
    UploadFoldersIcon: '' as Asset
  },
  class: {
    UploadHandlerDefinition: '' as Ref<Class<UploadHandlerDefinition>>
  },
  component: {
    FileUploadPopup: '' as AnyComponent
  },
  status: {
    Waiting: '' as IntlString,
    Uploading: '' as IntlString,
    Completed: '' as IntlString,
    Error: '' as IntlString
  },
  string: {
    UploadFiles: '' as IntlString,
    UploadFolders: '' as IntlString,
    Cancel: '' as IntlString,
    Retry: '' as IntlString
  },
  function: {
    ShowFilesUploadPopup: '' as Resource<UploadFilesPopupFn>,
    UploadFiles: '' as Resource<UploadFilesFn>,
    UploadFilesHandler: '' as Resource<UploadHandler>,
    UploadFoldersHandler: '' as Resource<UploadHandler>,
    GetUploadHandlers: '' as Resource<GetUploadHandlers>
  }
})

export default uploaderPlugin
