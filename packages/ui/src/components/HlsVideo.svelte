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
  import HLS from 'hls.js'
  import { onDestroy, onMount } from 'svelte'

  export let src: string
  export let hlsSrc: string
  export let hlsThumbnail: string
  export let name: string = ''

  let video: HTMLVideoElement
  let hls: HLS

  onMount(() => {
    if (HLS.isSupported()) {
      hls?.destroy()
      hls = new HLS({ autoStartLoad: false })
      hls.loadSource(hlsSrc)
      hls.attachMedia(video)

      video.poster = hlsThumbnail
      video.onplay = () => {
        // autoStartLoad disables autoplay, so we need to enable it manually
        video.onplay = null
        hls.startLoad()
      }
    } else {
      video.src = src
    }
  })

  onDestroy(() => {
    hls?.destroy()
  })
</script>

<video bind:this={video} width="100%" height="100%" controls>
  <track kind="captions" label={name} />
</video>

<style lang="scss">
  video {
    border-radius: inherit;
    object-fit: contain;
  }

  video::-webkit-media-controls {
    visibility: hidden;
  }

  video::-webkit-media-controls-enclosure {
    visibility: visible;
  }
</style>
