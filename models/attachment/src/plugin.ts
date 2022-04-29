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

import { attachmentId } from '@anticrm/attachment'
import attachment from '@anticrm/attachment-resources/src/plugin'
import type { IntlString } from '@anticrm/platform'
import { mergeIds } from '@anticrm/platform'
import type { Ref } from '@anticrm/core'
import type { AnyComponent } from '@anticrm/ui'
import type { TxViewlet } from '@anticrm/activity'
import { ViewAction } from '@anticrm/model-view'
import { Action } from '@anticrm/view'

export default mergeIds(attachmentId, attachment, {
  component: {
    AttachmentPresenter: '' as AnyComponent,
    FileBrowser: '' as AnyComponent
  },
  action: {
    CopyDirectLink: '' as Ref<Action>,
    OpenInNewTab: '' as Ref<Action>
  },
  actionImpl: {
    CopyDirectLink: '' as ViewAction,
    OpenInNewTab: '' as ViewAction
  },
  string: {
    AddAttachment: '' as IntlString,
    File: '' as IntlString,
    Name: '' as IntlString,
    Size: '' as IntlString,
    Type: '' as IntlString,
    Photo: '' as IntlString,
    Date: '' as IntlString,
    SavedAttachments: '' as IntlString,
    CopyDirectLink: '' as IntlString,
    OpenInNewTab: '' as IntlString
  },
  ids: {
    TxAttachmentCreate: '' as Ref<TxViewlet>
  },
  activity: {
    TxAttachmentCreate: '' as AnyComponent
  }
})
