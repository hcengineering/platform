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

import { type Blob, type Ref, generateId } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation, { generateFileId, getFileMetadata, getUploadUrl } from '@hcengineering/presentation'
import { getCurrentLanguage } from '@hcengineering/theme'
import type { FileUploadCallback, FileUploadOptions } from '@hcengineering/uploader'

import Uppy, { type IndexedObject, type UppyOptions } from '@uppy/core'
import XHR from '@uppy/xhr-upload'

import En from '@uppy/locales/lib/en_US'
import Fr from '@uppy/locales/lib/fr_FR'
import Es from '@uppy/locales/lib/es_ES'
import Pt from '@uppy/locales/lib/pt_PT'
import Ru from '@uppy/locales/lib/ru_RU'
import Zh from '@uppy/locales/lib/zh_CN'

type Locale = UppyOptions['locale']

const locales: Record<string, Locale> = {
  en: En,
  fr: Fr,
  pt: Pt,
  es: Es,
  ru: Ru,
  zh: Zh
}

function getUppyLocale (lang: string): Locale {
  return locales[lang] ?? En
}

// For Uppy 4.0 compatibility
type Meta = IndexedObject<any>
type Body = IndexedObject<any>

/** @public */
export type UppyMeta = Meta & {
  relativePath?: string
}

/** @public */
export type UppyBody = Body & {
  uuid: string
}

/** @public */
export function getUppy (options: FileUploadOptions, onFileUploaded?: FileUploadCallback): Uppy<UppyMeta, UppyBody> {
  const uppyOptions: Partial<UppyOptions> = {
    id: generateId(),
    locale: getUppyLocale(getCurrentLanguage()),
    allowMultipleUploadBatches: false,
    restrictions: {
      maxFileSize: options.maxFileSize,
      maxNumberOfFiles: options.maxNumberOfFiles,
      allowedFileTypes: options.allowedFileTypes
    }
  }

  const uppy = new Uppy<UppyMeta, UppyBody>(uppyOptions).use(XHR, {
    endpoint: getUploadUrl(),
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) as string)
    },
    getResponseError: (_, response) => {
      return new Error((response as Response).statusText)
    }
  })

  // Hack to setup shouldRetry callback on xhrUpload that is not exposed in options
  const xhrUpload = uppy.getState().xhrUpload ?? {}
  uppy.getState().xhrUpload = {
    ...xhrUpload,
    shouldRetry: (response: Response) => response.status !== 413
  }

  uppy.addPreProcessor(async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      const file = uppy.getFile(fileId)
      if (file != null) {
        const uuid = generateFileId()
        file.meta.uuid = uuid
        file.meta.name = uuid
      }
    }
  })

  if (onFileUploaded != null) {
    uppy.addPostProcessor(async (fileIds: string[]) => {
      // post-process only files without errors
      const files = fileIds
        .map((fileId) => uppy.getFile(fileId))
        .filter((file) => !('error' in file && file.error != null))

      for (const file of files) {
        const uuid = file.meta.uuid as Ref<Blob>
        if (uuid !== undefined) {
          const metadata = await getFileMetadata(file.data, uuid)
          await onFileUploaded(uuid, file.name, file.data, file.meta.relativePath, metadata)
        }
      }
    })
  }

  return uppy
}
