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
  import Plyr from 'plyr'
  import { onDestroy } from 'svelte'

  export let src: string
  export let name: string | undefined = undefined
  export let poster: string | undefined = undefined
  export let preload = true

  let video: HTMLVideoElement
  let player: Plyr | null = null

  const options: Plyr.Options = {
    tooltips: { controls: true, seek: true },
    keyboard: { focused: true, global: true },
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen']
  }

  $: if (video != null) {
    player?.destroy()
    player = new Plyr(video, options)
  }

  onDestroy(() => {
    player?.destroy()
    player = null
  })
</script>

<video
  bind:this={video}
  {src}
  data-poster={poster}
  width="100%"
  height="100%"
  preload={preload ? 'auto' : 'none'}
  disablepictureinpicture
>
  <track kind="captions" label={name ?? ''} />
</video>

<style lang="scss">
  video {
    background: inherit;
    border-radius: inherit;
    object-fit: contain;
  }

  video::-webkit-media-controls {
    visibility: hidden;
  }

  video::-webkit-media-controls-enclosure {
    visibility: visible;
  }

  @import 'plyr/dist/plyr.css';
  :global(.plyr) {
    flex: 1;
    min-width: 10rem;
    border-radius: 0.75rem;
    width: 100%;
    height: 100%;
    --plyr-control-spacing: 0.5rem;
    --plyr-control-icon-size: 1rem;
    --plyr-video-background: transparent;
  }

  // Hide controls when video is stopped and not hovered
  :global(.plyr.plyr--stopped:not(:hover) .plyr__controls) {
    opacity: 0;
    pointer-events: none;
    transform: translateY(100%);
  }
</style>
