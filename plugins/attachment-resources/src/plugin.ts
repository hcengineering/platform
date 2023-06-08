//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2022 Hardcore Engineering Inc.
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

import attachment, { attachmentId } from '@hcengineering/attachment'
import type { IntlString, StatusCode } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import { ViewAction } from '@hcengineering/view'

export default mergeIds(attachmentId, attachment, {
  string: {
    NoAttachments: '' as IntlString,
    UploadDropFilesHere: '' as IntlString,
    Photos: '' as IntlString,
    FileBrowser: '' as IntlString,
    FileBrowserFileCounter: '' as IntlString,
    FileBrowserListView: '' as IntlString,
    FileBrowserGridView: '' as IntlString,
    FileBrowserFilterFrom: '' as IntlString,
    FileBrowserFilterIn: '' as IntlString,
    FileBrowserFilterDate: '' as IntlString,
    FileBrowserFilterFileType: '' as IntlString,
    FileBrowserSort: '' as IntlString,
    FileBrowserSortNewest: '' as IntlString,
    FileBrowserSortOldest: '' as IntlString,
    FileBrowserSortAZ: '' as IntlString,
    FileBrowserSortZA: '' as IntlString,
    FileBrowserSortSmallest: '' as IntlString,
    FileBrowserSortBiggest: '' as IntlString,
    AddAttachmentToSaved: '' as IntlString,
    RemoveAttachmentFromSaved: '' as IntlString,
    Pinned: '' as IntlString
  },
  status: {
    FileTooLarge: '' as StatusCode
  },
  actionImpl: {
    AddAttachmentToSaved: '' as ViewAction,
    DeleteAttachmentFromSaved: '' as ViewAction,
    DeleteAttachment: '' as ViewAction
  }
})
