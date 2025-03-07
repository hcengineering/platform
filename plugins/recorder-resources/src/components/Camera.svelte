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
  import { onDestroy } from 'svelte'
  import Camera from './icons/Camera.svelte'
  import Close from './icons/Close.svelte'

  let showButtons = false
  let showCamera = false

  let videoElement: HTMLVideoElement
  let stream: MediaStream | null = null

  const stopCamera = (): void => {
    if (stream === null) {
      return
    }
    stream.getTracks().forEach((track) => {
      track.stop()
    })
    videoElement.srcObject = null
    stream = null
    showCamera = false
  }

  const startCamera = async (): Promise<void> => {
    stopCamera()
    showCamera = true
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { frameRate: { ideal: 30 } } })
      videoElement.srcObject = stream
    } catch (err) {
      console.log(err)
    }
  }

  onDestroy(async (): Promise<void> => {
    stopCamera()
  })
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  class="movable"
  on:mouseenter={() => {
    showButtons = true
  }}
  on:mouseleave={() => {
    showButtons = false
  }}
>
  {#if showCamera}
    <video class="video video-container" bind:this={videoElement} autoplay muted playsinline> </video>
    {#if showButtons}
      <div
        class="camera-control"
        on:click={() => {
          stopCamera()
        }}
      >
        <Close size="full" />
      </div>
    {/if}
  {:else}
    <div class="control">
      <span
        class="control-button"
        on:click={() => {
          startCamera()
        }}
      >
        <Camera size="medium" />
      </span>
    </div>
  {/if}
</div>

<style lang="scss">
  .video-container {
    width: 350px;
    height: 350px;
    transform: rotateY(180deg);
  }
  .video {
    border-radius: 50%;
    object-fit: cover;
  }
  .control {
    min-height: 2.8rem;
    min-width: 2.8rem;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    background: var(--theme-recorder-panel-bg);
    padding-left: 0.25rem;
    border-radius: 0.5rem;
    transition:
      max-width 0.4s ease-in-out,
      padding 0.3s ease-in-out;
    overflow: hidden;
    border: 0.5px solid var(--button-border-color);
  }
  .camera-control {
    position: absolute;
    transform: translateY(-350px);
    padding: 0.5rem 0.5rem;
    border-radius: 0.5rem;
    justify-content: center;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
  .control-button {
    padding: 0.5rem 0.5rem;
    border-radius: 0.5rem;
    justify-content: center;
    cursor: pointer;
    display: flex;
    flex-direction: row;
    align-items: center;
    background: var(--theme-recorder-active-button);
  }
</style>
