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
import { spawn } from 'child_process'
import { getImageMetadata } from './image'
import { TemporaryDir } from '../tempdir'

export interface VideoMetadata {
  duration?: number
  width?: number
  height?: number
  blurhash?: string
}

export async function getVideoMetadata (ctx: MeasureContext, dir: TemporaryDir, url: string): Promise<VideoMetadata> {
  const thumbnail = dir.tmpFile() + '.png'
  try {
    const metadata = await ctx.with('metadata', {}, () => extractMetadata(url))
    await ctx.with('thumbnail', {}, () => extractThumbnail(url, thumbnail))
    const { blurhash } = await getImageMetadata(ctx, thumbnail)

    return { ...metadata, blurhash }
  } finally {
    dir.rm(thumbnail)
  }
}

async function extractMetadata (url: string): Promise<VideoMetadata> {
  const ffprobe = spawn('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', url])

  return await new Promise((resolve, reject) => {
    let output = ''
    let error = ''

    ffprobe.stdout.on('data', (data) => {
      output += data.toString()
    })

    ffprobe.stderr.on('data', (data) => {
      error += data.toString()
    })

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${error}`))
      } else {
        try {
          const metadata = JSON.parse(output)
          resolve(parseMetadata(metadata))
        } catch (e: any) {
          reject(new Error(`Failed to parse metadata: ${e.message}`))
        }
      }
    })

    ffprobe.on('error', (err) => {
      reject(new Error(`Failed to start ffprobe: ${err.message}`))
    })
  })
}

async function extractThumbnail (url: string, path: string, timestamp = '00:00:01'): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', ['-i', url, '-ss', timestamp, '-frames:v', '1', '-q:v', '2', '-y', path])

    let error = ''

    ffmpeg.stderr.on('data', (data) => {
      error += data.toString()
    })

    ffmpeg.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}: ${error}`))
      } else {
        resolve()
      }
    })

    ffmpeg.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    })
  })
}

function parseMetadata (metadata: any): VideoMetadata {
  const streams: any[] = metadata.streams ?? []
  const videoStream = streams.find((s) => s.codec_type === 'video')

  if (videoStream === undefined) {
    throw new Error('No video stream found in metadata')
  }

  return {
    duration: parseFloat(metadata.format.duration),
    width: videoStream.width,
    height: videoStream.height
  }
}
