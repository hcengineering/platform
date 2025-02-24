//
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021, 2024 Hardcore Engineering Inc.
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

import type { AttachedDoc, Blob, Class, Doc, Ref } from '@hcengineering/core'
import type { Asset, Plugin } from '@hcengineering/platform'
import { IntlString, plugin, Resource } from '@hcengineering/platform'
import type { Preference } from '@hcengineering/preference'
import { AnyComponent } from '@hcengineering/ui'
import { Widget } from '@hcengineering/workbench'

export * from './analytics'

/**
 * @public
 */
export type BlobMetadata = Record<string, any>

/**
 * @public
 */
export interface Attachment extends AttachedDoc {
  name: string
  file: Ref<Blob>
  size: number
  type: string
  lastModified: number
  description?: string
  pinned?: boolean // If defined and true, will be shown in top of attachments collection

  readonly?: boolean // If readonly, user will not be able to remove or modify this attachment

  metadata?: AttachmentMetadata
}

/**
 * @public
 */
export interface Embedding extends Attachment {}

/**
 * @public
 */
export type AttachmentMetadata = BlobMetadata

/**
 * @public
 */
export interface Photo extends Attachment {}

/**
 * @public
 */
export interface SavedAttachments extends Preference {
  attachedTo: Ref<Attachment>
}

/**
 * @public
 */
export interface Drawing extends Doc {
  parent: Ref<Doc>
  parentClass: Ref<Class<Doc>>
  content?: string
}

/**
 * @public
 */
export const attachmentId = 'attachment' as Plugin

export default plugin(attachmentId, {
  component: {
    Attachments: '' as AnyComponent,
    Photos: '' as AnyComponent,
    AttachmentsPresenter: '' as AnyComponent,
    DrawingPresenter: '' as AnyComponent,
    FileBrowser: '' as AnyComponent,
    PDFViewer: '' as AnyComponent
  },
  icon: {
    Attachment: '' as Asset,
    FileBrowser: '' as Asset
  },
  class: {
    Attachment: '' as Ref<Class<Attachment>>,
    Embedding: '' as Ref<Class<Embedding>>,
    Drawing: '' as Ref<Class<Drawing>>,
    Photo: '' as Ref<Class<Photo>>,
    SavedAttachments: '' as Ref<Class<SavedAttachments>>
  },
  helper: {
    UploadFile: '' as Resource<(file: File) => Promise<Ref<Blob>>>,
    DeleteFile: '' as Resource<(id: string) => Promise<void>>
  },
  ids: {
    PreviewWidget: '' as Ref<Widget>
  },
  string: {
    Files: '' as IntlString,
    NoFiles: '' as IntlString,
    NoParticipants: '' as IntlString,
    ShowMoreAttachments: '' as IntlString,
    FileBrowserDateFilterAny: '' as IntlString,
    FileBrowserDateFilterToday: '' as IntlString,
    FileBrowserDateFilterYesterday: '' as IntlString,
    FileBrowserDateFilter7Days: '' as IntlString,
    FileBrowserDateFilter30Days: '' as IntlString,
    FileBrowserDateFilter3Months: '' as IntlString,
    FileBrowserDateFilter12Months: '' as IntlString,
    FileBrowserTypeFilterAny: '' as IntlString,
    FileBrowserTypeFilterImages: '' as IntlString,
    FileBrowserTypeFilterAudio: '' as IntlString,
    FileBrowserTypeFilterVideos: '' as IntlString,
    FileBrowserTypeFilterPDFs: '' as IntlString,
    DeleteFile: '' as IntlString,
    Attachments: '' as IntlString,
    FileBrowser: '' as IntlString,
    OpenInWindow: '' as IntlString,
    Embeddings: '' as IntlString
  }
})
