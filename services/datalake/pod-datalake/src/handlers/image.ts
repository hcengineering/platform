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

import { generateId, MeasureContext } from '@hcengineering/core'
import { type Request, type Response } from 'express'
import { createReadStream, mkdtempSync, rmSync } from 'fs'
import { writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import sharp from 'sharp'

import { type Datalake } from '../datalake'

const cacheControl = 'public, max-age=31536000, immutable'
const prefferedImageFormats = ['webp', 'avif', 'jpeg', 'png']

interface ImageTransform {
  format: string
  dpr?: number
  width?: number
  height?: number
  fit?: 'cover' | 'contain'
}

function parseImageTransform (accept: string, transform: string): ImageTransform {
  const image: ImageTransform = {
    format: 'jpeg',
    dpr: 1,
    fit: 'cover'
  }

  // select format based on Accept header
  const formats = accept.split(',')
  for (const format of formats) {
    const [type] = format.split(';')
    const [clazz, kind] = type.split('/')
    if (clazz === 'image' && prefferedImageFormats.includes(kind)) {
      image.format = kind
      break
    }
  }

  // parse transforms
  transform.split(',').forEach((param) => {
    const [key, value] = param.split('=')
    switch (key) {
      case 'dpr':
        image.dpr = parseFloat(value)
        break
      case 'width':
        image.width = parseInt(value)
        break
      case 'height':
        image.height = parseInt(value)
        break
    }
  })

  return image
}

export async function handleImageGet (
  ctx: MeasureContext,
  req: Request,
  res: Response,
  datalake: Datalake
): Promise<void> {
  const { workspace, name, transform } = req.params

  const accept = req.headers.accept ?? 'image/*'
  const image = parseImageTransform(accept, transform)

  const blob = await datalake.get(ctx, workspace, name, {})
  if (blob == null) {
    res.status(404).send()
    return
  }

  const dpr = image.dpr === undefined || Number.isNaN(image.dpr) ? 1 : image.dpr
  const width =
    image.width === undefined || Number.isNaN(image.width) ? undefined : Math.min(Math.round(image.width * dpr), 2048)
  const height =
    image.height === undefined || Number.isNaN(image.height)
      ? undefined
      : Math.min(Math.round(image.height * dpr), 2048)
  const fit = image.fit ?? 'cover'

  const tempDir = mkdtempSync(join(tmpdir(), 'image-'))
  const tmpFile = join(tempDir, generateId())
  const outFile = join(tempDir, generateId())

  try {
    await writeFile(tmpFile, blob.body)

    let pipeline = sharp(tmpFile)

    // auto orient image based on exif to prevent resize use wrong orientation
    pipeline = pipeline.rotate()

    pipeline.resize({
      width,
      height,
      fit,
      withoutEnlargement: true
    })

    let contentType = 'image/jpeg'
    switch (image.format) {
      case 'jpeg':
        pipeline = pipeline.jpeg({
          progressive: true
        })
        contentType = 'image/jpeg'
        break
      case 'avif':
        pipeline = pipeline.avif({
          lossless: false,
          effort: 0
        })
        contentType = 'image/avif'
        break
      case 'heif':
        pipeline = pipeline.heif({
          effort: 0
        })
        contentType = 'image/heif'
        break
      case 'webp':
        pipeline = pipeline.webp({
          effort: 0
        })
        contentType = 'image/webp'
        break
      case 'png':
        pipeline = pipeline.png({
          effort: 0
        })
        contentType = 'image/png'
        break
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', cacheControl)

    await ctx.with('sharp', {}, () => pipeline.toFile(outFile))
    pipeline.destroy()

    createReadStream(outFile).pipe(res)
  } catch (err: any) {
    ctx.error('image processing error', { workspace, name, error: err })

    res.setHeader('Content-Type', blob.contentType)
    res.setHeader('Cache-Control', blob.cacheControl ?? cacheControl)
    createReadStream(tmpFile).pipe(res)
  }

  res.on('finish', () => {
    try {
      rmSync(tempDir, { recursive: true })
    } catch (err: any) {
      ctx.error('failed to remove temp dir', { workspace, name, error: err })
    }
  })
}
