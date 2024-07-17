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

import { generateId } from '@hcengineering/core'
import { getMetadata } from '@hcengineering/platform'
import presentation from '@hcengineering/presentation'
import { getCurrentLanguage } from '@hcengineering/theme'
import type { FileUploadCallback, FileUploadOptions } from '@hcengineering/uploader'

import Uppy, { type IndexedObject, type UppyOptions } from '@uppy/core'
import ScreenCapture from '@uppy/screen-capture'
import Webcam from '@uppy/webcam'
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
export type UppyMeta = Meta

/** @public */
export type UppyBody = Body & {
  uuid: string
}

/** @public */
export function getUppy (options: FileUploadOptions, onFileUploaded?: FileUploadCallback): Uppy<UppyMeta, UppyBody> {
  const id = generateId()
  const locale = getUppyLocale(getCurrentLanguage())
  const uppy = new Uppy<UppyMeta, UppyBody>({ id, locale, ...options })
    .use(ScreenCapture)
    .use(Webcam)
    .use(XHR, {
      endpoint: getMetadata(presentation.metadata.UploadURL) ?? '',
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + (getMetadata(presentation.metadata.Token) as string)
      },
      getResponseData: (body: string): UppyBody => {
        return {
          uuid: body
        }
      }
    })

  if (onFileUploaded != null) {
    uppy.addPostProcessor(async (fileIds: string[]) => {
      for (const fileId of fileIds) {
        const file = uppy.getFile(fileId)
        const uuid = file?.response?.body?.uuid
        if (uuid !== undefined) {
          await onFileUploaded(uuid, file.name, file.data)
        }
      }
    })
  }

  return uppy
}
