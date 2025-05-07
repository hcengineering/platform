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

import drive, { createFile } from '@hcengineering/drive'
import { translate } from '@hcengineering/platform'
import { getClient } from '@hcengineering/presentation'
import { type FileUploadCallback, type FileUploadCallbackParams } from '@hcengineering/uploader'
import recorder from './plugin'

export function formatElapsedTime (elapsed: number): string {
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const displaySeconds = (seconds % 60).toString().padStart(2, '0')
  const displayMinutes = (minutes % 60).toString().padStart(2, '0')

  return hours > 0 ? `${hours}:${displayMinutes}:${displaySeconds}` : `${displayMinutes}:${displaySeconds}`
}

export async function formatRecordingName (date: Date): Promise<string> {
  const timeStr = date.toLocaleTimeString()
  const dateStr = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return await translate(recorder.string.RecordingTitle, { date: dateStr + ' ' + timeStr })
}

export const createRecordingInDrive: FileUploadCallback = async (params: FileUploadCallbackParams): Promise<void> => {
  const { uuid, name, file, metadata } = params

  const client = getClient()
  const data = {
    file: uuid,
    size: file.size,
    type: file.type,
    lastModified: file instanceof File ? file.lastModified : Date.now(),
    title: name,
    metadata
  }

  await createFile(client, recorder.space.Drive, drive.ids.Root, data)
}
