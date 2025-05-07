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
  import media, { getCameraStream, getSelectedCamId, getSelectedMicId } from '@hcengineering/media'
  import { useMedia } from '@hcengineering/media-resources'
  import { InvertedTheme } from '@hcengineering/theme'
  import { Button } from '@hcengineering/ui'
  import type { FileUploadCallback } from '@hcengineering/uploader'
  import { onDestroy } from 'svelte'

  import { type CameraSize } from '../types'

  import Camera from './Camera.svelte'
  import Draggable from './Draggable.svelte'
  import Panel from './Panel.svelte'

  export let onFileUploaded: FileUploadCallback | undefined

  export function canClose (): boolean {
    // Avoid closing the camera when Esc is pressed
    // Consider allowing closing the popup when recording not started
    return false
  }

  let size = (localStorage.getItem('recorder.camera.size') as CameraSize) ?? 'medium'
  $: localStorage.setItem('recorder.camera.size', size)

  let useCamera = true
  let isCamEnabled = true
  let isMicEnabled = true
  let camDeviceId = getSelectedCamId()
  let micDeviceId = getSelectedMicId()

  let streamPromise = Promise.resolve()
  let stream: MediaStream | null = null

  const session = useMedia({
    state: {
      camera: { enabled: isCamEnabled },
      microphone: { enabled: isMicEnabled }
    }
  })

  session.on('camera', (enabled) => {
    isCamEnabled = enabled
  })

  session.on('microphone', (enabled) => {
    isMicEnabled = enabled
  })

  session.on('selected-camera', (deviceId) => {
    camDeviceId = deviceId
  })

  session.on('selected-microphone', (deviceId) => {
    micDeviceId = deviceId
  })

  function enableCamera (stream: MediaStream | null, useCamera: boolean): void {
    if (useCamera) {
      session.setCamera({ enabled: isCamEnabled })
    } else {
      session.setCamera(undefined)
    }
  }

  function enableAudioTracks (stream: MediaStream | null, enabled: boolean): void {
    if (stream != null) {
      const tracks = stream.getAudioTracks()
      for (const track of tracks) {
        track.enabled = enabled
      }
      session.setMicrophone({ enabled })
    }
  }

  function enableVideoTracks (stream: MediaStream | null, enabled: boolean): void {
    if (stream != null) {
      const tracks = stream.getVideoTracks()
      for (const track of tracks) {
        track.enabled = enabled
      }
      session.setCamera(useCamera ? { enabled } : undefined)
    }
  }

  async function releaseStream (stream: MediaStream | null): Promise<void> {
    if (stream !== null) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }

  async function updateStream (
    camDeviceId: string | undefined,
    micDeviceId: string | undefined,
    useCamera: boolean
  ): Promise<void> {
    await releaseStream(stream)

    if (!useCamera) return

    try {
      // TODO we should request both audio and video tracks depending on enabled state
      stream = await getCameraStream(camDeviceId)
    } catch (err) {
      console.warn(err)
      stream = null
    }
  }

  $: streamPromise = updateStream(camDeviceId, micDeviceId, useCamera)
  $: enableCamera(stream, useCamera)
  $: enableAudioTracks(stream, isMicEnabled)
  $: enableVideoTracks(stream, isCamEnabled)

  onDestroy(async () => {
    await streamPromise
    await releaseStream(stream)
  })

  let posX = 0
  let posY = 0
  let dragging = false

  // Tooltip direction based on the popup position
  let direction: 'top' | 'bottom' = 'bottom'
  $: direction = posY > 0 ? 'top' : 'bottom'

  function handleOpenCamera (): void {
    useCamera = true
  }

  function handleCloseCamera (): void {
    useCamera = false
  }
</script>

<Draggable bind:dragging bind:posX bind:posY key={'recorder.popup.position'}>
  <InvertedTheme>
    <div class="container">
      {#if useCamera}
        <Camera bind:size {stream} {isCamEnabled} on:close={handleCloseCamera} />
      {:else}
        <div class="buttons-panel" class:pointer-events-none={dragging}>
          <Button icon={media.icon.Cam} kind={'icon'} noFocus on:click={handleOpenCamera} />
        </div>
      {/if}

      <Panel bind:isMicEnabled {dragging} {direction} {onFileUploaded} cameraStream={stream} on:close />
    </div>
  </InvertedTheme>
</Draggable>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    gap: 0.5rem;
    padding: 1rem;

    transition: all 0.5s ease;
  }

  .buttons-panel {
    display: flex;
    align-items: center;
    border-radius: 0.75rem;
    border: 1px solid var(--button-border-color);
    background-color: var(--theme-bg-color);
    gap: 0.375rem;
    padding: 0.375rem;
  }
</style>
