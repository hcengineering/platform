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

import { Analytics } from '@hcengineering/analytics'
import { MeasureContext, type WorkspaceUuid } from '@hcengineering/core'
import { type Request, type Response } from 'express'
import { createReadStream, createWriteStream } from 'fs'
import sharp from 'sharp'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

import config from '../config'
import { CacheEntry, type Datalake, createCache, streamToBuffer } from '../datalake'
import { TemporaryDir } from '../tempdir'

const cacheControl = 'public, max-age=31536000, immutable'
const prefferedImageFormats = ['webp', 'avif', 'jpeg', 'png']

const cache = createCache(config.Cache)

const QualityConfig = {
  jpeg: {
    quality: 85, // default + 5
    progressive: true,
    chromaSubsampling: '4:4:4'
  } satisfies sharp.JpegOptions,
  avif: {
    quality: 60, // default + 10
    effort: 5, // default + 1
    chromaSubsampling: '4:4:4' // default
  } satisfies sharp.AvifOptions,
  webp: {
    quality: 80, // default
    alphaQuality: 100, // default
    smartSubsample: true, // Better sharpness
    effort: 5 // default + 1
  } satisfies sharp.WebpOptions,
  heif: {
    quality: 80, // default + 30
    effort: 5 // default + 1
  } satisfies sharp.HeifOptions,
  png: {
    quality: 100, // default
    effort: 7 // default
  } satisfies sharp.PngOptions
}

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
  datalake: Datalake,
  tempDir: TemporaryDir
): Promise<void> {
  const { name, transform } = req.params
  const workspace = req.params.workspace as WorkspaceUuid

  const accept = req.headers.accept ?? 'image/*'
  const { format, width, height, fit } = getImageTransformParams(accept, transform)

  const tmpFile = tempDir.tmpFile()
  const outFile = tempDir.tmpFile()

  const cleanup = (): void => {
    tempDir.rm(tmpFile, outFile)
  }

  req.on('error', cleanup)
  req.on('close', cleanup)
  res.on('error', cleanup)
  res.on('finish', cleanup)

  const cached = cacheGet(workspace, name, { width, height, format, fit })
  if (cached !== undefined) {
    await writeCacheEntryToResponse(ctx, cached, res)
    return
  }

  const blob = await datalake.get(ctx, workspace, name, {})
  if (blob == null) {
    res.status(404).send()
    return
  }

  try {
    await writeTempFile(tmpFile, blob.body)
  } finally {
    blob.body.destroy()
  }

  try {
    const { contentType, size } = await ctx.with(
      'sharp',
      { format },
      () => {
        return runPipeline(tmpFile, outFile, { format, width, height, fit })
      },
      { fit, width, height, size: blob.size }
    )

    if (cacheEnabled(size)) {
      const buffer = await streamToBuffer(createReadStream(outFile))

      const entry = {
        name: blob.name,
        etag: blob.etag,
        size: blob.size,
        bodyEtag: blob.etag,
        bodyLength: buffer.length,
        lastModified: blob.lastModified,
        body: buffer,
        contentType,
        cacheControl
      }

      cachePut(workspace, name, { width, height, format, fit }, entry)

      await writeCacheEntryToResponse(ctx, entry, res)
    } else {
      await writeFileToResponse(ctx, outFile, res, { contentType, cacheControl })
    }
  } catch (err: any) {
    Analytics.handleError(err)
    ctx.error('image processing error', { workspace, name, error: err })

    const headers = {
      contentType: blob.contentType,
      cacheControl: blob.cacheControl ?? cacheControl
    }

    await writeFileToResponse(ctx, tmpFile, res, headers)
  }
}

interface ImageTransformParams {
  format: string
  width: number | undefined
  height: number | undefined
  fit: 'cover' | 'contain'
}

async function runPipeline (
  inFile: string,
  outFile: string,
  params: ImageTransformParams
): Promise<{ contentType: string, size: number }> {
  const { format, width, height, fit } = params

  let pipeline: sharp.Sharp | undefined

  try {
    pipeline = sharp(inFile, { sequentialRead: true })

    // auto orient image based on exif to prevent resize use wrong orientation
    pipeline = pipeline.rotate()

    pipeline.resize({
      width,
      height,
      fit,
      withoutEnlargement: true
    })

    let contentType = 'image/jpeg'
    switch (format) {
      case 'jpeg':
        pipeline = pipeline.jpeg(QualityConfig.jpeg)
        contentType = 'image/jpeg'
        break
      case 'avif':
        pipeline = pipeline.avif(QualityConfig.avif)
        contentType = 'image/avif'
        break
      case 'heif':
        pipeline = pipeline.heif(QualityConfig.heif)
        contentType = 'image/heif'
        break
      case 'webp':
        pipeline = pipeline.webp(QualityConfig.webp)
        contentType = 'image/webp'
        break
      case 'png':
        pipeline = pipeline.png(QualityConfig.png)
        contentType = 'image/png'
        break
    }

    const { size } = await pipeline.toFile(outFile)

    return { contentType, size }
  } finally {
    pipeline?.destroy()
  }
}

function getImageTransformParams (accept: string, transform: string): ImageTransformParams {
  const image = parseImageTransform(accept, transform)
  const format = image.format

  const dpr = image.dpr === undefined || Number.isNaN(image.dpr) ? 1 : image.dpr
  const width =
    image.width === undefined || Number.isNaN(image.width) ? undefined : Math.min(Math.round(image.width * dpr), 2048)
  const height =
    image.height === undefined || Number.isNaN(image.height)
      ? undefined
      : Math.min(Math.round(image.height * dpr), 2048)
  const fit = image.fit ?? 'cover'

  return { format, width, height, fit }
}

async function writeTempFile (path: string, stream: Readable): Promise<void> {
  const outp = createWriteStream(path)
  await pipeline(stream, outp)
}

async function writeCacheEntryToResponse (ctx: MeasureContext, cached: CacheEntry, res: Response): Promise<void> {
  const readable = Readable.from(cached.body)
  await writeToResponse(ctx, readable, res, { contentType: cached.contentType, cacheControl })
}

async function writeFileToResponse (
  ctx: MeasureContext,
  path: string,
  res: Response,
  headers: { contentType: string, cacheControl: string }
): Promise<void> {
  const stream = createReadStream(path)
  await writeToResponse(ctx, stream, res, headers)
}

async function writeToResponse (
  ctx: MeasureContext,
  stream: Readable,
  res: Response,
  headers: { contentType: string, cacheControl: string }
): Promise<void> {
  res.setHeader('Content-Type', headers.contentType)
  res.setHeader('Cache-Control', headers.cacheControl)

  try {
    await pipeline(stream, res)
  } catch (err: any) {
    // ignore abort errors to avoid flooding the logs
    if (err.name === 'AbortError' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
      return
    }
    Analytics.handleError(err)
    const error = err instanceof Error ? err.message : String(err)
    ctx.error('error writing response', { error })
    if (!res.headersSent) {
      res.status(500).send('Internal Server Error')
    }
  }
}

function cacheKey (workspace: WorkspaceUuid, name: string, params: ImageTransformParams): string {
  return `${workspace}/${name}/${params.width ?? 0}/${params.height ?? 0}/${params.format}/${params.fit}`
}

function cacheEnabled (size: number): boolean {
  return cache.enabled(size)
}

function cacheGet (workspace: WorkspaceUuid, name: string, params: ImageTransformParams): CacheEntry | undefined {
  return cache.get(cacheKey(workspace, name, params))
}

function cachePut (workspace: WorkspaceUuid, name: string, params: ImageTransformParams, entry: CacheEntry): void {
  cache.set(cacheKey(workspace, name, params), entry)
}
