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
import { getMetadata, PlatformError, unknownError } from '@hcengineering/platform'
import presentation, {
  type FileUploadParams,
  generateFileId,
  getFileMetadata,
  getFileUploadParams,
  getUploadUrl
} from '@hcengineering/presentation'
import { getCurrentLanguage } from '@hcengineering/theme'
import type { FileUploadOptions } from '@hcengineering/uploader'

import Uppy, { type UppyFile, type UppyOptions } from '@uppy/core'
import XHR from '@uppy/xhr-upload'

import En from '@uppy/locales/lib/en_US'
import Fr from '@uppy/locales/lib/fr_FR'
import Es from '@uppy/locales/lib/es_ES'
import Pt from '@uppy/locales/lib/pt_PT'
import Ru from '@uppy/locales/lib/ru_RU'
import Zh from '@uppy/locales/lib/zh_CN'

import type { UppyBody, UppyMeta } from './types'

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

interface XHRFileProcessor {
  name: string
  onBeforeUpload: (uppy: Uppy, file: UppyFile, params: FileUploadParams) => Promise<void>
  onAfterUpload: (uppy: Uppy, file: UppyFile, params: FileUploadParams) => Promise<void>
}

const FormDataFileProcessor: XHRFileProcessor = {
  name: 'form-data',

  onBeforeUpload: async (uppy: Uppy, file: UppyFile, { url, headers }: FileUploadParams): Promise<void> => {
    const xhrUpload = 'xhrUpload' in file && typeof file.xhrUpload === 'object' ? file.xhrUpload : {}
    const state = {
      xhrUpload: {
        ...xhrUpload,
        endpoint: url,
        method: 'POST',
        formData: true,
        headers
      }
    }
    uppy.setFileState(file.id, state)
  },

  onAfterUpload: async (uppy: Uppy, file: UppyFile, params: FileUploadParams): Promise<void> => {}
}

const SignedURLFileProcessor: XHRFileProcessor = {
  name: 'signed-url',

  onBeforeUpload: async (uppy: Uppy, file: UppyFile, { url, headers }: FileUploadParams): Promise<void> => {
    const xhrUpload = 'xhrUpload' in file && typeof file.xhrUpload === 'object' ? file.xhrUpload : {}
    const signedUrl = await getSignedUploadUrl(file, url)
    const state = {
      xhrUpload: {
        ...xhrUpload,
        formData: false,
        method: 'PUT',
        endpoint: signedUrl,
        headers: {
          ...headers,
          // S3 direct upload does not require authorization
          Authorization: '',
          'Content-Type': file.type
        }
      }
    }
    uppy.setFileState(file.id, state)
  },

  onAfterUpload: async (uppy: Uppy, file: UppyFile, params: FileUploadParams): Promise<void> => {
    const error = 'error' in file && file.error != null
    await fetch(params.url, { method: error ? 'DELETE' : 'PUT' })
  }
}

/** @public */
export function getUppy (options: FileUploadOptions): Uppy<UppyMeta, UppyBody> {
  const { onFileUploaded } = options

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

  const uppy = new Uppy<UppyMeta, UppyBody>(uppyOptions)

  // Ensure we always have UUID
  uppy.addPreProcessor(async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      const file = uppy.getFile(fileId)
      if (file != null && file.meta.uuid === undefined) {
        uppy.setFileMeta(fileId, { uuid: generateFileId() })
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
          await onFileUploaded({
            uuid,
            name: file.name,
            file: file.data,
            path: file.meta.relativePath,
            metadata
          })
        } else {
          console.warn('missing file metadata uuid', file)
        }
      }
    })
  }

  configureXHR(uppy)

  return uppy
}

function configureXHR (uppy: Uppy<UppyMeta, UppyBody>): Uppy<UppyMeta, UppyBody> {
  uppy.use(XHR, {
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
    shouldRetry: (response: Response) => !(response.status in [401, 403, 413])
  }

  uppy.addPreProcessor(async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      const file = uppy.getFile(fileId)
      if (file != null) {
        const params = getFileUploadParams(file.meta.uuid, file.data)
        const processor = getXHRProcessor(file, params)
        await processor.onBeforeUpload(uppy, file, params)
      }
    }
  })

  uppy.addPostProcessor(async (fileIds: string[]) => {
    for (const fileId of fileIds) {
      const file = uppy.getFile(fileId)
      if (file != null) {
        const params = getFileUploadParams(file.meta.uuid, file.data)
        const processor = getXHRProcessor(file, params)
        await processor.onAfterUpload(uppy, file, params)
      }
    }
  })

  return uppy
}

function getXHRProcessor (file: UppyFile, params: FileUploadParams): XHRFileProcessor {
  return params.method === 'form-data' ? FormDataFileProcessor : SignedURLFileProcessor
}

async function getSignedUploadUrl (file: UppyFile, signUrl: string): Promise<string> {
  const response = await fetch(signUrl, { method: 'POST' })
  if (!response.ok) {
    throw new PlatformError(unknownError('Failed to get signed upload url'))
  }

  return await response.text()
}
