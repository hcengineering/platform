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
import sharp from 'sharp'

import { makeBlurhash } from '../utils'

export interface ImageMetadata {
  width?: number
  height?: number
  density?: number
  blurhash: string
}

export async function getImageMetadata (ctx: MeasureContext, image: Buffer | string): Promise<ImageMetadata> {
  const pipeline = sharp(image)

  try {
    const metadata = await ctx.with('metadata', {}, () => pipeline.metadata())
    const blurhash = await ctx.with('blurhash', {}, () => makeBlurhash(pipeline))

    return {
      density: metadata.density,
      width: metadata.width,
      height: metadata.height,
      blurhash
    }
  } finally {
    pipeline.destroy()
  }
}
