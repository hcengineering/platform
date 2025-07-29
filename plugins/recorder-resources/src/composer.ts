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
import type { CameraPosition, CameraSize } from './types'

export interface StreamComposerConfig {
  fps: number
  cameraSize: CameraSize
  cameraPos: CameraPosition
  onCanvasSizeChange?: (size: { width: number, height: number }) => void
}

export interface StreamComposer {
  destroy: () => void

  getStream: () => MediaStream

  updateConfig: (config: Partial<StreamComposerConfig>) => void
  updateCameraStream: (stream: MediaStream | null) => void
  updateScreenStream: (stream: MediaStream | null) => void
}

function createWorker (): Worker {
  try {
    return new Worker(/* webpackChunkName: "recorder-worker" */ new URL('./recorder-worker.ts', import.meta.url))
  } catch (error) {
    // Fallback to direct path if needed
    return new Worker('./recorder-worker.js')
  }
}

export function createCanvasStreamComposer (config: StreamComposerConfig): StreamComposer {
  return new CanvasStreamComposer(config)
}

class CanvasStreamComposer implements StreamComposer {
  private readonly boundHandleWorkerMessage = this.handleWorkerMessage.bind(this)
  private readonly boundHandleWorkerError = this.handleWorkerError.bind(this)

  private readonly ctx: CanvasRenderingContext2D
  private readonly canvas: HTMLCanvasElement
  private readonly cameraVideo: HTMLVideoElement
  private readonly screenVideo: HTMLVideoElement
  private readonly worker: Worker

  private readonly canvasStream: MediaStream
  private cameraStream: MediaStream | null = null
  private screenStream: MediaStream | null = null

  private running = false
  private cameraX: number = 0
  private cameraY: number = 0
  private cameraR: number = 0

  constructor (private config: StreamComposerConfig) {
    const { canvas, ctx } = createCanvasElement()
    this.canvas = canvas
    this.ctx = ctx

    this.cameraVideo = createVideoElement()
    this.cameraVideo.onerror = (err) => {
      console.error('CanvasStreamComposer: failed to play camera video', err)
    }

    this.screenVideo = createVideoElement()
    this.screenVideo.onerror = (err) => {
      console.error('CanvasStreamComposer: failed to play screen video', err)
    }

    this.worker = createWorker()

    this.canvasStream = this.canvas.captureStream(config.fps)

    this.start()
  }

  public destroy (): void {
    this.stop()
  }

  public getStream (): MediaStream {
    return this.canvasStream
  }

  private start (): void {
    if (this.running) return

    try {
      this.startWorker()
      this.running = true
    } catch (error) {
      console.error('CanvasStreamComposer: error starting', error)
      throw error
    }
  }

  private stop (): void {
    if (!this.running) return
    this.running = false

    this.stopWorker()

    if (this.cameraVideo !== null) {
      this.cameraVideo.pause()
      this.cameraVideo.srcObject = null
    }

    if (this.screenVideo !== null) {
      this.screenVideo.pause()
      this.screenVideo.srcObject = null
    }

    releaseStream(this.canvasStream)
  }

  public updateConfig (config: Partial<StreamComposerConfig>): void {
    this.config = { ...this.config, ...config }

    if (config.fps !== undefined) {
      const tracks = this.canvasStream.getVideoTracks()
      for (const track of tracks) {
        void track.applyConstraints({ frameRate: { ideal: config.fps } })
      }

      this.worker.postMessage({ type: 'fps', fps: config.fps })
    }

    this.updateCameraPos()
  }

  public updateCameraStream (stream: MediaStream | null): void {
    this.cameraStream = stream
    this.updateVideoSources()
  }

  public updateScreenStream (stream: MediaStream | null): void {
    this.screenStream = stream
    this.updateVideoSources()
  }

  private updateVideoSources (): void {
    this.screenVideo.srcObject = this.screenStream ?? this.cameraStream
    this.cameraVideo.srcObject = this.screenStream !== null ? this.cameraStream : null
  }

  private startWorker (): void {
    this.worker.addEventListener('message', this.boundHandleWorkerMessage)
    this.worker.addEventListener('error', this.boundHandleWorkerError)
    this.worker.postMessage({ type: 'start', fps: this.config.fps })
  }

  private stopWorker (): void {
    this.worker.postMessage({ type: 'stop' })
    this.worker.removeEventListener('message', this.boundHandleWorkerMessage)
    this.worker.removeEventListener('error', this.boundHandleWorkerError)
    this.worker.terminate()
  }

  private handleWorkerMessage (e: MessageEvent): void {
    if (e.data.type === 'frame' && this.running) {
      this.drawFrame()
    } else if (e.data.type === 'error') {
      console.error('Worker error:', e.data.error)
    }
  }

  private handleWorkerError (e: ErrorEvent): void {
    console.log('Worker error:', e.message)
    e.preventDefault()
  }

  private drawFrame (): void {
    const { ctx, canvas, cameraVideo, screenVideo, cameraX, cameraY, cameraR } = this

    // Only update canvas size if video dimensions changed
    if (screenVideo.videoWidth > 0 && screenVideo.videoHeight > 0) {
      if (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight) {
        this.updateCanvasSize(screenVideo.videoWidth, screenVideo.videoHeight)
        this.updateCameraPos()
      }
    }

    // Draw the screen video
    if (screenVideo.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height)
    }

    // Draw the camera video
    if (cameraVideo.srcObject !== null && cameraVideo.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
      let camDrawX = cameraX - cameraR
      let camDrawY = cameraY - cameraR
      let camDrawW = 2 * cameraR
      let camDrawH = 2 * cameraR

      const cameraAspectRatio = cameraVideo.videoWidth / cameraVideo.videoHeight

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
      ctx.drawImage(cameraVideo, camDrawX, camDrawY, camDrawW, camDrawH)
      ctx.restore()
    }
  }

  private updateCanvasSize (width: number, height: number): void {
    this.canvas.width = width
    this.canvas.height = height
    this.config.onCanvasSizeChange?.({ width, height })
  }

  private updateCameraPos (): void {
    const { cameraX, cameraY, cameraR } = updateCameraPos(
      this.config.cameraSize,
      this.config.cameraPos,
      this.canvas.width,
      this.canvas.height
    )

    this.cameraX = cameraX
    this.cameraY = cameraY
    this.cameraR = cameraR
  }
}

function getCameraSize (size: CameraSize): number {
  switch (size) {
    case 'small':
      return 0.1
    case 'medium':
      return 0.15
    case 'large':
      return 0.2
    default:
      return 0.15
  }
}

function createCanvasElement (): { canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas')

  const ctx = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true
  })

  if (ctx === null) {
    throw new Error('CanvasStreamComposer: unable to get canvas context')
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  return { canvas, ctx }
}

function createVideoElement (): HTMLVideoElement {
  const element = document.createElement('video')
  element.autoplay = true
  element.playsInline = true
  return element
}

function updateCameraPos (
  cameraSize: CameraSize,
  cameraPos: CameraPosition,
  canvasWidth: number,
  canvasHeight: number
): { cameraX: number, cameraY: number, cameraR: number } {
  const size = getCameraSize(cameraSize)
  const cameraR = size * Math.min(canvasWidth, canvasHeight)
  const cameraM = Math.min(canvasWidth, canvasHeight) * 0.05

  let cameraX: number
  let cameraY: number

  switch (cameraPos) {
    case 'top-left':
      cameraX = cameraM + cameraR
      cameraY = cameraM + cameraR
      break
    case 'top-right':
      cameraX = canvasWidth - cameraM - cameraR
      cameraY = cameraM + cameraR
      break
    case 'bottom-left':
      cameraX = cameraM + cameraR
      cameraY = canvasHeight - cameraM - cameraR
      break
    case 'bottom-right':
      cameraX = canvasWidth - cameraM - cameraR
      cameraY = canvasHeight - cameraM - cameraR
      break
  }

  return { cameraX, cameraY, cameraR }
}
