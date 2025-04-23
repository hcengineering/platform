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
  import { cleanupDeviceLabel } from '@hcengineering/media'
  import { IconCheck, Label } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'

  import media from '../plugin'

  import IconCamOff from './icons/CamOff.svelte'
  import StatusIcon from './StatusIcon.svelte'

  export let devices: MediaDeviceInfo[]
  export let selected: MediaDeviceInfo | null

  const dispatch = createEventDispatcher()

  let current: MediaDeviceInfo | null = selected
  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null

  let streamUpdatePromise = Promise.resolve()

  async function releaseStream (stream: MediaStream | null): Promise<void> {
    if (stream !== null) {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    }
  }

  async function updateStream (device: MediaDeviceInfo | null): Promise<void> {
    await releaseStream(stream)
    if (device != null) {
      const constraints = device !== null ? { video: { deviceId: { exact: device.deviceId } } } : { video: true }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia(constraints)
        if (current?.deviceId === device.deviceId) {
          stream = newStream
        } else {
          // Device changed while we were waiting the stream
          await releaseStream(newStream)
        }
      } catch (err) {
        console.warn(err)
        stream = null
      }
    } else {
      stream = null
    }
  }

  function handleDeviceChange (device: MediaDeviceInfo): void {
    if (current?.deviceId === device?.deviceId) return

    if (device === undefined) {
      dispatch('update', undefined)
    } else {
      dispatch('update', device.deviceId)
    }
    current = device
  }

  $: streamUpdatePromise = updateStream(current)

  $: if (video !== null && stream !== null) {
    video.srcObject = stream
  }

  $: if (video !== null && stream === null) {
    video.srcObject = null
  }

  onDestroy(async () => {
    await streamUpdatePromise
    await releaseStream(stream)
  })
</script>

<div class="antiPopup antiPopup-withHeader thinStyle">
  <div class="ap-space" />

  <div class="ap-header">
    <div class="ap-caption">
      <Label label={media.string.Camera} />
    </div>

    <div class="ap-space x2" />

    <div class="preview">
      <!-- svelte-ignore a11y-media-has-caption -->
      <video bind:this={video} width="100%" height="100%" autoplay muted disablepictureinpicture />
    </div>
  </div>

  <div class="ap-space" />

  <div class="ap-scroll">
    <div class="ap-box">
      {#if devices.length > 0}
        {#each devices as device}
          <div class="ap-menuItem separator halfMargin" />

          <button
            class="ap-menuItem noMargin withIcon flex-row-center flex-grow"
            on:click={() => {
              handleDeviceChange(device)
            }}
          >
            <div class="flex-between flex-grow flex-gap-2">
              <div class="flex-row-center">
                <span class="label overflow-label font-medium">{cleanupDeviceLabel(device.label)}</span>
              </div>

              {#if current?.deviceId === device.deviceId}
                <div class="check">
                  <IconCheck size={'small'} />
                </div>
              {/if}
            </div>
          </button>
        {/each}
      {:else}
        <!--  -->
        <div class="ap-menuItem separator halfMargin" />

        <button
          class="ap-menuItem noMargin withIcon flex-row-center flex-grow"
          on:click={() => {
            // handleDeviceChange(null)
          }}
        >
          <div class="flex-between flex-grow flex-gap-2">
            <div class="flex-row-center flex-gap-2">
              <StatusIcon icon={IconCamOff} size={'small'} status={current === null ? 'off' : undefined} />
              <span class="label overflow-label font-medium">
                <Label label={media.string.NoCam} />
              </span>
            </div>

            {#if current === null}
              <div class="check">
                <IconCheck size={'small'} />
              </div>
            {/if}
          </div>
        </button>
      {/if}

      <div class="ap-space" />
    </div>
  </div>
</div>

<style lang="scss">
  .antiPopup {
    width: 20rem;
  }

  .preview {
    border-radius: 0.25rem;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;

    display: flex;
    align-items: center;
    justify-content: center;
  }

  video {
    border-radius: inherit;
    transform: rotateY(180deg);
    object-fit: cover;
  }
</style>
