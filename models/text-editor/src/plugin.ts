//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2022, 2023, 2024 Hardcore Engineering Inc.
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

import { mergeIds, type Resource } from '@hcengineering/platform'
import textEditor, {
  type TextActionFunction,
  type TextActionVisibleFunction,
  textEditorId,
  type RefInputActionDisabledFn
} from '@hcengineering/text-editor'

export default mergeIds(textEditorId, textEditor, {
  function: {
    FormatLink: '' as Resource<TextActionFunction>,
    OpenTableOptions: '' as Resource<TextActionFunction>,
    OpenImage: '' as Resource<TextActionFunction>,
    ExpandImage: '' as Resource<TextActionFunction>,
    MoreImageActions: '' as Resource<TextActionFunction>,
    ConfigureNote: '' as Resource<TextActionFunction>,
    DownloadImage: '' as Resource<TextActionFunction>,

    IsEditableTableActive: '' as Resource<TextActionVisibleFunction>,
    IsEditableNote: '' as Resource<TextActionVisibleFunction>,
    IsEditable: '' as Resource<TextActionVisibleFunction>,
    IsHeadingVisible: '' as Resource<TextActionVisibleFunction>,
    DisableInlineCommands: '' as Resource<RefInputActionDisabledFn>
  }
})
