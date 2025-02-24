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

import type { IntlString, Plugin, Resource } from '@hcengineering/platform'
import { plugin } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui/src/types'

import type { UploadFilesFn, UploadFilesPopupFn } from './types'

/** @public */
export const uploaderId = 'uploader' as Plugin

export const uploaderPlugin = plugin(uploaderId, {
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
    Cancel: '' as IntlString,
    Retry: '' as IntlString
  },
  function: {
    ShowFilesUploadPopup: '' as Resource<UploadFilesPopupFn>,
    UploadFiles: '' as Resource<UploadFilesFn>
  }
})

export default uploaderPlugin
