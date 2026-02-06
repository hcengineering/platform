//
// Copyright © 2025 Hardcore Engineering Inc.
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

import { concatLink } from '@hcengineering/core'
import { FileStorage, FileStorageUploadOptions } from '../types'
import { uploadMultipart, uploadXhr } from '../upload'

const getPathname = (url: string): string => {
  const base = window?.location?.href !== undefined ? window.location.href : 'http://localhost'
  return new URL(url, base).pathname
}

/** @public */
export class DatalakeStorage implements FileStorage {
  constructor (private readonly baseUrl: string) {}

  getFileUrl (workspace: string, file: string, filename?: string): string {
    const path = filename !== undefined ? `/blob/${workspace}/${file}/${filename}` : `/blob/${workspace}/${file}`
    return concatLink(this.baseUrl, path)
  }

  getCookiePath (workspace: string): string {
    const url = concatLink(this.baseUrl, `/blob/${workspace}`)
    return getPathname(url)
  }

  async getFileMeta (token: string, workspace: string, file: string): Promise<Record<string, any>> {
    const url = concatLink(this.baseUrl, `/meta/${encodeURIComponent(workspace)}/${encodeURIComponent(file)}`)
    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (response.ok) {
        return await response.json()
      }
    } catch (err: any) {}
    return {}
  }

  async deleteFile (token: string, workspace: string, file: string): Promise<void> {
    const url = this.getFileUrl(workspace, file)

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to delete file')
    }
  }

  async uploadFile (
    token: string,
    workspace: string,
    uuid: string,
    file: File,
    options?: FileStorageUploadOptions
  ): Promise<void> {
    if (file.size <= 10 * 1024 * 1024) {
      const formData = new FormData()
      formData.append('file', file, uuid)

      await uploadXhr(
        {
          url: concatLink(this.baseUrl, `/upload/form-data/${encodeURIComponent(workspace)}`),
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        },
        options
      )
    } else {
      const url = concatLink(
        this.baseUrl,
        `/upload/multipart/${encodeURIComponent(workspace)}/${encodeURIComponent(uuid)}`
      )
      const headers = { Authorization: `Bearer ${token}` }
      await uploadMultipart({ url, headers, body: file }, options)
    }
  }
}
