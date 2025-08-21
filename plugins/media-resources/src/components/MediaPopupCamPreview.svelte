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
  import { releaseStream } from '@hcengineering/media'
  import { onDestroy } from 'svelte'

  export let selected: MediaDeviceInfo

  let streamUpdatePromise = Promise.resolve()
  let stream: MediaStream | null = null
  let video: HTMLVideoElement | null = null

  async function updateStream (device: MediaDeviceInfo): Promise<void> {
    const constraints =
      device !== null
        ? { video: { deviceId: { exact: device.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } }
        : { video: { width: { ideal: 1280 }, height: { ideal: 720 } } }

    releaseStream(stream)

    try {
      const newStream = await navigator.mediaDevices.getUserMedia(constraints)
      if (selected.deviceId === device.deviceId) {
        stream = newStream
      } else {
        // Device changed while we were waiting the stream
        releaseStream(newStream)
      }
    } catch (err) {
      console.warn(err)
      stream = null
    }
  }

  onDestroy(async () => {
    await streamUpdatePromise
    releaseStream(stream)
  })

  $: streamUpdatePromise = updateStream(selected)

  $: if (video !== null && stream !== null) {
    video.srcObject = stream
  }

  $: if (video !== null && stream === null) {
    video.srcObject = null
  }
</script>

<div class="container">
  {#if stream !== null}
    <!-- svelte-ignore a11y-media-has-caption -->
    <video bind:this={video} width="100%" height="100%" autoplay muted disablepictureinpicture />
  {/if}
</div>

<style lang="scss">
  .container {
    padding: 0.375rem;
    border-radius: 0.375rem;
    width: 100%;

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
