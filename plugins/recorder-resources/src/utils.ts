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

import { type IntlString, translate } from '@hcengineering/platform'
import { DefaultVideoRes } from './const'
import { type CameraPosition, type CameraSize } from './types'

export function getRecordingResolution (): number {
  const value = localStorage.getItem('recorder.resolution')
  const parsedValue = parseInt(value ?? '')
  return Number.isInteger(parsedValue) ? parsedValue : DefaultVideoRes
}

export function setRecordingResolution (resolution: number): void {
  localStorage.setItem('recorder.resolution', resolution.toString())
}

export function getRecordingCameraSize (): CameraSize {
  const value = localStorage.getItem('recorder.camera.size')
  return (value as CameraSize) ?? 'medium'
}

export function setRecordingCameraSize (size: CameraSize): void {
  localStorage.setItem('recorder.camera.size', size)
}

export function getRecordingCameraPosition (): CameraPosition {
  const value = localStorage.getItem('recorder.camera.pos')
  return (value as CameraPosition) ?? 'bottom-left'
}

export function setRecordingCameraPosition (pos: CameraPosition): void {
  localStorage.setItem('recorder.camera.pos', pos)
}

export function getUseScreenShareSound (): boolean {
  const value = localStorage.getItem('recorder.screen.sound')
  return value === 'true'
}

export function setUseScreenShareSound (value: boolean): void {
  localStorage.setItem('recorder.screen.sound', value.toString())
}

export function formatElapsedTime (elapsed: number): string {
  const seconds = Math.floor(elapsed / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  const displaySeconds = (seconds % 60).toString().padStart(2, '0')
  const displayMinutes = (minutes % 60).toString().padStart(2, '0')

  return hours > 0 ? `${hours}:${displayMinutes}:${displaySeconds}` : `${displayMinutes}:${displaySeconds}`
}

export async function formatRecordingName (label: IntlString, date: Date): Promise<string> {
  const timeStr = date.toLocaleTimeString()
  const dateStr = date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return await translate(label, { date: dateStr + ' ' + timeStr })
}

export function combineMediaStreams (...streams: MediaStream[]): MediaStream {
  const tracks: MediaStreamTrack[] = []

  for (const stream of streams) {
    tracks.push(...stream.getTracks())
  }

  return new MediaStream(tracks)
}

export const getVideoDimensions = async (stream: MediaStream): Promise<{ width: number, height: number }> => {
  const tracks = stream.getVideoTracks()
  if (tracks.length > 0) {
    let maxWidth = 0
    let maxHeight = 0

    for (const track of tracks) {
      const { width, height } = track.getSettings()
      maxWidth = Math.max(maxWidth, width ?? 0)
      maxHeight = Math.max(maxHeight, height ?? 0)
    }

    if (maxWidth === 0 || maxHeight === 0) {
      // in Firefox width and height may be not available in track settings,
      // so we need to create a video element to get the dimensions
      await new Promise((resolve) => {
        const video = document.createElement('video')
        video.srcObject = stream
        video.onloadedmetadata = () => {
          maxWidth = video.videoWidth
          maxHeight = video.videoHeight
          video.remove()
          resolve(null)
        }
        video.play().catch(() => {
          // Ignore play errors, just resolve
          video.remove()
          resolve(null)
        })
      })
    }

    if (maxWidth === 0 || maxHeight === 0) {
      throw new Error('No video tracks found')
    }

    return { width: maxWidth, height: maxHeight }
  }

  throw new Error('No video tracks found')
}

export function whenStreamEnded (stream: MediaStream, callback: () => void): void {
  const tracks = stream.getTracks()

  const cleanup = (): void => {
    callback()

    for (const track of tracks) {
      track.onended = null
    }
  }

  const onendedOnce = once(cleanup)
  for (const track of tracks) {
    track.onended = onendedOnce
  }
}

export function once<P extends any[], T> (fn: (...args: P) => T): (...args: P) => T {
  let called = false
  let result: T

  return (...args: any) => {
    if (!called) {
      called = true
      result = fn(...args)
    }
    return result
  }
}
