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
import decodeHeic from 'heic-decode'
import sharp from 'sharp'

export async function heicToPng (ctx: MeasureContext, heicFile: string): Promise<string> {
  const pngFile: string = heicFile + '.png'

  const buffer = await readFile(heicFile)

  const { data, width, height } = await ctx.with('heic-decode', {}, () =>
    decodeHeic({
      // @ts-expect-error wrong types
      buffer: new Uint8Array(buffer)
    })
  )

  await ctx.with('sharp', {}, async () => {
    await sharp(data, {
      raw: {
        width,
        height,
        channels: 4
      }
    })
      .png()
      .toFile(pngFile)
  })

  return pngFile
}
