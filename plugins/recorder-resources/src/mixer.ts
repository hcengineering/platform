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

import { releaseStream } from '@hcengineering/media'
import { combineMediaStreams } from './utils'

export interface CanvasMixerOptions {
  fps: number

  canvasWidth: number
  canvasHeight: number

  cameraX: number
  cameraY: number
  cameraR: number
}

export interface StreamMixer {
  start: () => Promise<void>
  stop: () => Promise<void>
  getStream: () => MediaStream
}

export class CanvasStreamMixer implements StreamMixer {
  private recording = false
  private readonly canvas: HTMLCanvasElement
  private readonly cameraVideo: HTMLVideoElement
  private readonly screenVideo: HTMLVideoElement
  private mixedStream: MediaStream | null = null
  private animationFrameId: number | null = null

  constructor (
    private readonly screenStream: MediaStream,
    private readonly cameraStream: MediaStream | null,
    private readonly micStream: MediaStream | null,
    private readonly options: CanvasMixerOptions
  ) {
    if (screenStream.getVideoTracks().length === 0) {
      throw new Error('CanvasStreamMixer: screen stream must have a video track')
    }

    if (cameraStream !== null && cameraStream.getVideoTracks().length === 0) {
      throw new Error('CanvasStreamMixer: camera stream must have a video track')
    }

    const screenVideoTrack = screenStream.getVideoTracks()[0]
    const { width: sourceWidth, height: sourceHeight } = screenVideoTrack.getSettings()
    if (sourceWidth === undefined || sourceHeight === undefined) {
      throw new Error('CanvasStreamMixer: screen stream video track must have width and height')
    }

    this.mixedStream = null

    this.canvas = document.createElement('canvas')
    this.canvas.width = options.canvasWidth
    this.canvas.height = options.canvasHeight

    this.cameraVideo = document.createElement('video')
    this.cameraVideo.autoplay = true
    this.cameraVideo.playsInline = true
    this.cameraVideo.srcObject = this.cameraStream

    this.screenVideo = document.createElement('video')
    this.screenVideo.srcObject = this.screenStream
    this.screenVideo.autoplay = true
    this.screenVideo.playsInline = true
  }

  public getStream (): MediaStream {
    if (this.mixedStream === null) {
      const audioStream = this.getMixedAudioStream()
      const canvasStream = this.canvas.captureStream(this.options.fps)
      this.mixedStream = combineMediaStreams(audioStream, canvasStream)
    }
    return this.mixedStream
  }

  public async start (): Promise<void> {
    if (this.recording) return

    try {
      const promises = []

      if (this.cameraStream !== null && this.cameraStream.getVideoTracks().length > 0) {
        promises.push(this.cameraVideo.play())
      }
      if (this.screenStream !== null && this.screenStream.getVideoTracks().length > 0) {
        promises.push(this.screenVideo.play())
      }

      await Promise.all(promises)

      this.startDrawing()
      this.recording = true
    } catch (error) {
      console.error('CanvasStreamMixer: error starting', error)
      throw error
    }
  }

  public async stop (): Promise<void> {
    if (!this.recording) return
    this.recording = false

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }

    this.cameraVideo.pause()
    this.screenVideo.pause()

    this.cameraVideo.srcObject = null
    this.screenVideo.srcObject = null

    if (this.mixedStream !== null) {
      releaseStream(this.mixedStream)
      this.mixedStream = null
    }
  }

  private getMixedAudioStream (): MediaStream {
    const tracks: MediaStreamTrack[] = []

    if (this.micStream !== null) {
      for (const track of this.micStream.getAudioTracks()) {
        tracks.push(track)
      }
    }

    if (this.cameraStream !== null) {
      for (const track of this.cameraStream.getAudioTracks()) {
        if (!tracks.some((t) => t.id === track.id)) {
          tracks.push(track)
        }
      }
    }

    for (const track of this.screenStream.getAudioTracks()) {
      if (!tracks.some((t) => t.id === track.id)) {
        tracks.push(track)
      }
    }

    return new MediaStream(tracks)
  }

  private startDrawing (): void {
    const ctx = this.canvas.getContext('2d')
    if (ctx === null) {
      throw new Error('MediaStreamMixer: unable to get canvas context')
    }

    const { cameraX, cameraY, cameraR, fps } = this.options
    const interval = 1000 / fps

    const drawFrame = (): void => {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

      // Draw the screen video
      if (this.screenVideo.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
        ctx.drawImage(this.screenVideo, 0, 0, this.canvas.width, this.canvas.height)
      }

      // Draw the camera video
      if (this.cameraVideo.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
        const cameraAspectRatio = this.cameraVideo.videoWidth / this.cameraVideo.videoHeight

        let camDrawX = cameraX - cameraR
        let camDrawY = cameraY - cameraR
        let camDrawW = 2 * cameraR
        let camDrawH = 2 * cameraR

        if (cameraAspectRatio > 1) {
          // camera is wider than container
          camDrawW = camDrawH * cameraAspectRatio
          camDrawX = cameraX - camDrawW / 2
        } else {
          // camera is taller than container
          camDrawH = camDrawW / cameraAspectRatio
          camDrawY = cameraY - camDrawH / 2
        }

        ctx.beginPath()
        ctx.arc(cameraX, cameraY, cameraR, 0, Math.PI * 2)
        ctx.closePath()
        ctx.save()
        ctx.clip()
        ctx.drawImage(this.cameraVideo, camDrawX, camDrawY, camDrawW, camDrawH)
        ctx.restore()
      }
    }

    // Main drawing loop
    let lastDraw = 0
    const draw = (now: number): void => {
      if (!this.recording) return
      const elapsed = now - lastDraw

      if (elapsed >= interval) {
        drawFrame()
        lastDraw = now
      }

      this.animationFrameId = requestAnimationFrame(draw)
    }

    this.animationFrameId = requestAnimationFrame(draw)
  }
}
