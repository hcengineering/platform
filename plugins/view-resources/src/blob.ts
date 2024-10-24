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

import { type Blob, type Ref } from '@hcengineering/core'
import { type BlobMetadata, getImageSize } from '@hcengineering/presentation'

export async function blobImageMetadata (file: File, blob: Ref<Blob>): Promise<BlobMetadata | undefined> {
  if (file.size === 0) {
    return undefined
  }

  const size = await getImageSize(file)

  return {
    originalHeight: size.height,
    originalWidth: size.width,
    pixelRatio: size.pixelRatio
  }
}

export async function blobVideoMetadata (file: File, blob: Ref<Blob>): Promise<BlobMetadata | undefined> {
  if (file.size === 0) {
    return undefined
  }

  const size = await getVideoSize(file)

  if (size === undefined) {
    return undefined
  }

  return {
    originalHeight: size.height,
    originalWidth: size.width
  }
}

async function getVideoSize (file: File): Promise<{ width: number, height: number } | undefined> {
  const promise = new Promise<{ width: number, height: number }>((resolve, reject) => {
    const element = document.createElement('video')

    const src = URL.createObjectURL(file)

    element.onloadedmetadata = () => {
      const height = element.videoHeight
      const width = element.videoWidth

      URL.revokeObjectURL(src)
      resolve({ height, width })
    }

    element.onerror = reject
    element.src = src
  })

  return await promise
}
