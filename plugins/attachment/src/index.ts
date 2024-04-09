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

import type { AttachedDoc, Class, Ref } from '@hcengineering/core'
import type { Asset, Plugin } from '@hcengineering/platform'
import { IntlString, plugin, Resource } from '@hcengineering/platform'
import type { Preference } from '@hcengineering/preference'
import { AnyComponent, ComponentExtensionId } from '@hcengineering/ui'
import { type ComponentPointExtension } from '@hcengineering/presentation'

/**
 * @public
 */
export interface Attachment extends AttachedDoc {
  name: string
  file: string
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
export type AttachmentMetadata = ImageMetadata | VideoMetadata

/**
 * @public
 */
export interface ImageMetadata {
  originalWidth: number
  originalHeight: number
  pixelRatio: number
}

/**
 * @public
 */
export interface VideoMetadata {
  originalWidth: number
  originalHeight: number
}

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
export interface AttachmentPreviewExtension extends ComponentPointExtension {
  contentType: string | string[]
  alignment?: string
  // Extension is only available if this checker returns true
  availabilityChecker?: Resource<() => Promise<boolean>>
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
    FileBrowser: '' as AnyComponent,
    PDFViewer: '' as AnyComponent,
    MediaViewer: '' as AnyComponent
  },
  icon: {
    Attachment: '' as Asset,
    FileBrowser: '' as Asset
  },
  class: {
    Attachment: '' as Ref<Class<Attachment>>,
    Photo: '' as Ref<Class<Photo>>,
    SavedAttachments: '' as Ref<Class<SavedAttachments>>,
    AttachmentPreviewExtension: '' as Ref<Class<AttachmentPreviewExtension>>
  },
  helper: {
    UploadFile: '' as Resource<(file: File) => Promise<string>>,
    DeleteFile: '' as Resource<(id: string) => Promise<void>>
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
    FileBrowser: '' as IntlString
  },
  previewExtension: {
    Image: '' as Ref<AttachmentPreviewExtension>,
    Media: '' as Ref<AttachmentPreviewExtension>,
    PDF: '' as Ref<AttachmentPreviewExtension>
  },
  extension: {
    AttachmentPreview: '' as ComponentExtensionId
  }
})
