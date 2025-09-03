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

import sharp from 'sharp'

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

export interface ImageTransformParams {
  format: string
  width: number | undefined
  height: number | undefined
  fit: 'cover' | 'contain'
}

export async function transformImage (
  srcFile: string,
  dstFile: string,
  params: ImageTransformParams
): Promise<{ contentType: string, size: number }> {
  const { format, width, height, fit } = params

  let pipeline: sharp.Sharp | undefined

  try {
    pipeline = sharp(srcFile, { sequentialRead: true })

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

    const { size } = await pipeline.toFile(dstFile)

    return { contentType, size }
  } finally {
    pipeline?.destroy()
  }
}
