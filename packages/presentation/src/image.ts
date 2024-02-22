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

import extract from 'png-chunks-extract'

export async function getImageSize (
  file: File,
  src: string
): Promise<{ width: number, height: number, pixelRatio: number }> {
  const size = isPng(file) ? await getPngImageSize(file) : undefined

  const promise = new Promise<{ width: number, height: number, pixelRatio: number }>((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({
        width: size?.width ?? img.naturalWidth,
        height: size?.height ?? img.naturalHeight,
        pixelRatio: size?.pixelRatio ?? 1
      })
    }

    img.onerror = reject
    img.src = src
  })

  return await promise
}

function isPng (file: File): boolean {
  return file.type === 'image/png'
}

async function getPngImageSize (file: File): Promise<{ width: number, height: number, pixelRatio: number } | undefined> {
  if (!isPng(file)) {
    return undefined
  }

  try {
    const buffer = await file.arrayBuffer()
    const chunks = extract(new Uint8Array(buffer))

    const pHYsChunk = chunks.find((chunk) => chunk.name === 'pHYs')
    const iHDRChunk = chunks.find((chunk) => chunk.name === 'IHDR')

    if (pHYsChunk === undefined || iHDRChunk === undefined) {
      return undefined
    }

    // See http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html
    // Section 4.1.1. IHDR Image header
    // Section 4.2.4.2. pHYs Physical pixel dimensions
    const idhrData = parseIHDR(new DataView(iHDRChunk.data.buffer))
    const physData = parsePhys(new DataView(pHYsChunk.data.buffer))

    if (physData.unit === 0 && physData.ppux === physData.ppuy) {
      const pixelRatio = Math.round(physData.ppux / 2834.5)
      return {
        width: idhrData.width,
        height: idhrData.height,
        pixelRatio
      }
    }
  } catch (err) {
    console.error(err)
    return undefined
  }

  return undefined
}

// See http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html
// Section 4.1.1. IHDR Image header
function parseIHDR (view: DataView): { width: number, height: number } {
  return {
    width: view.getUint32(0),
    height: view.getUint32(4)
  }
}

// See http://www.libpng.org/pub/png/spec/1.2/PNG-Chunks.html
// Section 4.2.4.2. pHYs Physical pixel dimensions
function parsePhys (view: DataView): { ppux: number, ppuy: number, unit: number } {
  return {
    ppux: view.getUint32(0),
    ppuy: view.getUint32(4),
    unit: view.getUint8(4)
  }
}
