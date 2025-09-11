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

import { type MeasureContext } from '@hcengineering/core'
import { readFile } from 'fs/promises'
import { decode } from 'bmp-ts'
import sharp from 'sharp'

export async function bmpToPng (ctx: MeasureContext, bmpFile: string): Promise<string> {
  const pngFile: string = bmpFile + '.png'

  const buffer = await readFile(bmpFile)

  const data = await ctx.with('bmp-decode', {}, () => {
    return decode(Buffer.from(buffer), { toRGBA: false })
  })

  // Manually convert to RGBA as library does not seem to handle this properly
  for (let i = 0; i < data.data.length; i += 4) {
    // const a = data.data[i + 0]
    const b = data.data[i + 1]
    const g = data.data[i + 2]
    const r = data.data[i + 3]
    data.data[i + 0] = r
    data.data[i + 1] = g
    data.data[i + 2] = b
    data.data[i + 3] = 0xff
  }

  await ctx.with('sharp', {}, async () => {
    await sharp(data.data, {
      raw: {
        width: data.width,
        height: data.height,
        channels: 4
      }
    })
      .png()
      .toFile(pngFile)
  })

  return pngFile
}
