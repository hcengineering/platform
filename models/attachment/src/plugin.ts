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

import type { DisplayTx, TxViewlet } from '@hcengineering/activity'
import { attachmentId } from '@hcengineering/attachment'
import attachment from '@hcengineering/attachment-resources/src/plugin'
import type { Ref, Doc } from '@hcengineering/core'
import type { IntlString, Resource } from '@hcengineering/platform'
import { mergeIds } from '@hcengineering/platform'
import type { AnyComponent } from '@hcengineering/ui'
import type { ActionCategory } from '@hcengineering/view'

export default mergeIds(attachmentId, attachment, {
  component: {
    AttachmentPresenter: '' as AnyComponent,
    FileBrowser: '' as AnyComponent
  },
  string: {
    AddAttachment: '' as IntlString,
    File: '' as IntlString,
    Name: '' as IntlString,
    Size: '' as IntlString,
    Type: '' as IntlString,
    Photo: '' as IntlString,
    Date: '' as IntlString,
    LastModified: '' as IntlString,
    SavedAttachments: '' as IntlString,
    Description: '' as IntlString,
    PinAttachment: '' as IntlString,
    UnPinAttachment: '' as IntlString,
    FilterAttachments: '' as IntlString,
    RemovedAttachment: '' as IntlString
  },
  ids: {
    TxAttachmentCreate: '' as Ref<TxViewlet>,
    TxAttachmentRemove: '' as Ref<TxViewlet>
  },
  activity: {
    TxAttachmentCreate: '' as AnyComponent
  },
  category: {
    Attachments: '' as Ref<ActionCategory>
  },
  filter: {
    AttachmentsFilter: '' as Resource<(tx: DisplayTx, _class?: Ref<Doc>) => boolean>
  }
})
