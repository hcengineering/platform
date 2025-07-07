<!--
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
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { CameraPosition, CameraSize } from '../types'

  export let canvas: HTMLCanvasElement | undefined = undefined

  export let screenStream: MediaStream | null = null
  export let cameraStream: MediaStream | null = null

  export let fps: number = 30
  export let canvasWidth: number = 1280
  export let canvasHeight: number = 720

  export let cameraSize: CameraSize = 'medium'
  export let cameraPos: CameraPosition = 'bottom-left'

  const worker = createWorker()

  function createWorker (): Worker {
    try {
      return new Worker(/* webpackChunkName: "recorder-worker" */ new URL('../recorder-worker.ts', import.meta.url))
    } catch (error) {
      // Fallback to direct path if needed
      return new Worker('./recorder-worker.js')
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

  function updateCameraPos (
    cameraSize: CameraSize,
    cameraPos: CameraPosition,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    const size = getCameraSize(cameraSize)
    cameraR = size * Math.min(canvasWidth, canvasHeight)

    const cameraM = Math.min(canvasWidth, canvasHeight) * 0.05
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
  }

  let cameraX: number = 64
  let cameraY: number = 64
  let cameraR: number = 64

  let running = false
  let cameraVideo: HTMLVideoElement | null = null
  let screenVideo: HTMLVideoElement | null = null

  $: updateCameraPos(cameraSize, cameraPos, canvasWidth, canvasHeight)
  $: updateVideoSources(screenStream, cameraStream)

  $: if (running && fps > 0) {
    worker.postMessage({ type: 'fps', fps })
  }

  function updateVideoSources (screenStream: MediaStream | null, cameraStream: MediaStream | null): void {
    if (screenVideo === null || cameraVideo === null) {
      return
    }

    screenVideo.srcObject = screenStream ?? cameraStream
    cameraVideo.srcObject = screenStream !== null ? cameraStream : null
  }

  let ctx: CanvasRenderingContext2D | null = null

  function drawFrame (): void {
    if (!ctx || !canvas || !screenVideo || !cameraVideo) return

    // Only update canvas size if video dimensions changed
    if (screenVideo.videoWidth && screenVideo.videoHeight) {
      if (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight) {
        canvasWidth = canvas.width = screenVideo.videoWidth
        canvasHeight = canvas.height = screenVideo.videoHeight
      }
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw the screen video
    if (screenVideo.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
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

  function handleWorkerMessage (e: MessageEvent): void {
    if (e.data.type === 'frame' && running) {
      drawFrame()
    } else if (e.data.type === 'error') {
      console.error('Worker error:', e.data.error)
    }
  }

  function handleWorkerError (e: ErrorEvent): void {
    console.log('Worker error:', e.message)
    e.preventDefault()
  }

  function startDrawing (): void {
    if (running) return
    if (canvas == null) return

    running = true

    screenVideo = document.createElement('video')
    screenVideo.srcObject = screenStream ?? cameraStream
    screenVideo.autoplay = true

    cameraVideo = document.createElement('video')
    cameraVideo.srcObject = screenStream !== null ? cameraStream : null
    cameraVideo.autoplay = true

    ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true
    })
    if (ctx === null) return
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    worker.addEventListener('message', handleWorkerMessage)
    worker.addEventListener('error', handleWorkerError)
    worker.postMessage({ type: 'start', fps })
  }

  function stopDrawing (): void {
    running = false

    worker.postMessage({ type: 'stop' })
    worker.removeEventListener('message', handleWorkerMessage)
    worker.removeEventListener('error', handleWorkerError)

    if (cameraVideo !== null) {
      cameraVideo.pause()
      cameraVideo.srcObject = null
      cameraVideo = null
    }

    if (screenVideo !== null) {
      screenVideo.pause()
      screenVideo.srcObject = null
      screenVideo = null
    }
  }

  onMount(() => {
    startDrawing()
  })

  onDestroy(() => {
    stopDrawing()
  })
</script>

<canvas bind:this={canvas} width={canvasWidth} height={canvasHeight} />

<style lang="scss">
  canvas {
    border-radius: inherit;
  }
</style>
