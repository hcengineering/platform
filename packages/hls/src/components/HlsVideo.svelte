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
  import { getMetadata } from '@hcengineering/platform'
  import presentation, { getFileUrl } from '@hcengineering/presentation'
  import HLS, { HlsConfig, LoaderConfiguration, LoaderContext, LoaderCallbacks, LoadPolicy } from 'hls.js'
  import { onDestroy, onMount } from 'svelte'
  import Plyr from 'plyr'

  export let src: string
  export let hlsSrc: string
  export let hlsThumbnail = ''
  export let preload = true

  let video: HTMLVideoElement | null = null
  let hls: HLS | null = null
  let player: Plyr | null = null

  $: src = getFileUrl(src, '')
  $: hlsSrc = hlsSrc !== '' ? getFileUrl(hlsSrc, '') : ''
  $: hlsThumbnail = hlsThumbnail !== '' ? getFileUrl(hlsThumbnail, '') : ''

  const token = getMetadata(presentation.metadata.Token) ?? ''

  class loader extends HLS.DefaultConfig.loader {
    constructor (config: HlsConfig) {
      super(config)
      this.load = this.load.bind(this)
    }

    load (context: LoaderContext, config: LoaderConfiguration, callbacks: LoaderCallbacks<LoaderContext>): void {
      const url = new URL(context.url)
      const pathname = url.pathname.endsWith('/') ? url.pathname.slice(0, -1) : url.pathname
      const blobId = pathname.split('/').pop()
      if (blobId !== undefined) {
        context.url = getFileUrl(blobId, '')
      }

      const headers = context.headers ?? {}
      headers.Authorization = `Bearer ${token}`
      context.headers = headers

      super.load(context, config, callbacks)
    }
  }

  const options: Plyr.Options = {
    tooltips: { controls: true, seek: true },
    keyboard: { focused: true, global: true },
    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen']
  }

  function initialize (src: string): void {
    if (video === null) {
      return
    }

    if (!HLS.isSupported()) {
      video.src = src
      player = new Plyr(video, options)
      return
    }
    hls?.destroy()
    player?.destroy()
    const loadPolicy: LoadPolicy = {
      default: {
        maxTimeToFirstByteMs: Infinity,
        maxLoadTimeMs: 1000 * 60,
        timeoutRetry: {
          maxNumRetry: 20,
          retryDelayMs: 100,
          maxRetryDelayMs: 250
        },
        errorRetry: {
          maxNumRetry: 20,
          retryDelayMs: 100,
          maxRetryDelayMs: 250,
          shouldRetry: (retryConfig, retryCount) => retryCount < (retryConfig?.maxNumRetry ?? 10)
        }
      }
    }
    hls = new HLS({
      loader,
      manifestLoadPolicy: loadPolicy,
      playlistLoadPolicy: loadPolicy,
      autoStartLoad: preload
    })
    hls.loadSource(hlsSrc)
    hls.attachMedia(video)
    video.poster = hlsThumbnail
    if (!preload) {
      video.onplay = () => {
        if (video === null) {
          return
        }
        video.onplay = null
        hls?.startLoad()
      }
    }
    hls.on(HLS.Events.MANIFEST_PARSED, () => {
      if (hls === null) {
        return
      }
      const availableQualities = hls?.levels.map((l) => l.height)
      availableQualities.unshift(0)

      options.quality = {
        default: 0,
        options: availableQualities,
        forced: true,
        onChange: (e) => {
          updateQuality(e)
        }
      }

      options.captions = {
        active: false
      }
      options.i18n = {
        qualityLabel: {
          0: 'Auto'
        }
      }
      if (video === null) {
        return
      }
      player = new Plyr(video, options)
    })
  }

  $: initialize(src)

  onMount(() => {
    initialize(src)
  })

  onDestroy(() => {
    hls?.destroy()
    player?.destroy()
  })

  function updateQuality (newQuality: number): void {
    if (hls === null) {
      return
    }
    if (newQuality === 0) {
      hls.currentLevel = -1
    } else {
      hls.levels.forEach((level, levelIndex) => {
        if (level.height === newQuality && hls !== null) {
          hls.currentLevel = levelIndex
        }
      })
    }
  }
</script>

<!-- svelte-ignore a11y-media-has-caption -->
<video bind:this={video} width="100%" height="100%" preload={preload ? 'auto' : 'none'} disablepictureinpicture />

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
