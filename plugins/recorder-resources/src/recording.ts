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

import { type FileUploadOptions, type FileUploadCallback } from '@hcengineering/uploader'
import Recorder from './components/Recorder.svelte'
import { showPopup } from '@hcengineering/ui'
import { type Blob, type Ref } from '@hcengineering/core'
import { getFileUrl } from '@hcengineering/presentation'

let recorderOppened = false

export async function record (options: FileUploadOptions): Promise<void> {
  if (recorderOppened) {
    return
  }
  if (options.onFileUploaded === undefined) {
    return
  }
  recorderOppened = true
  const onUploaded = options.onFileUploaded
  showPopup(
    Recorder,
    {},
    undefined,
    async (status: any) => {
      if (typeof status === 'string') {
        await uploadRecording(status, onUploaded)
      }
      recorderOppened = false
    },
    undefined,
    {
      category: 'control',
      overlay: false,
      fixed: true
    }
  )
}

async function uploadRecording (recordingName: string, onUploaded: FileUploadCallback): Promise<void> {
  await onUploaded({
    uuid: getBlobUrl(recordingName) as Ref<Blob>,
    name: 'Recording-' + now(),
    file: { ...new Blob(), type: 'video/x-mpegURL' },
    type: 'video/x-mpegURL',
    path: undefined,
    metadata: undefined,
    navigateOnUpload: true
  })
}

function now (): string {
  const date = new Date()
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString()
}

function getBlobUrl (file: string): string {
  const fileUrl = getFileUrl(file)
  const u = new URL(fileUrl)
  if (u.searchParams.has('file')) {
    return u.toString()
  }
  return fileUrl.split('/').slice(0, -1).join('/')
}
