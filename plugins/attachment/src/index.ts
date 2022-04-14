//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

import type { AttachedDoc, Class, Doc, Ref, Space } from '@anticrm/core'
import type { Asset, Plugin } from '@anticrm/platform'
import { IntlString, plugin, Resource } from '@anticrm/platform'
import { AnyComponent } from '@anticrm/ui'

/**
 * @public
 */
export interface Attachment extends AttachedDoc {
  name: string
  file: string
  size: number
  type: string
  lastModified: number
}

/**
 * @public
 */
export interface Photo extends Attachment {}

/**
 * @public
 */
export const attachmentId = 'attachment' as Plugin

export default plugin(attachmentId, {
  component: {
    Attachments: '' as AnyComponent,
    Photos: '' as AnyComponent,
    AttachmentsPresenter: '' as AnyComponent
  },
  icon: {
    Attachment: '' as Asset
  },
  class: {
    Attachment: '' as Ref<Class<Attachment>>,
    Photo: '' as Ref<Class<Photo>>
  },
  helper: {
    UploadFile: '' as Resource<(file: File, opts?: { space: Ref<Space>, attachedTo: Ref<Doc> }) => Promise<string>>,
    DeleteFile: '' as Resource<(id: string) => Promise<void>>
  },
  string: {
    Files: '' as IntlString,
    NoFiles: '' as IntlString,
    ShowMoreAttachments: '' as IntlString
  }
})
