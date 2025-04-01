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
  import HLS, { LoadPolicy } from 'hls.js'
  import { onDestroy, onMount } from 'svelte'
  import Plyr from 'plyr'

  export let src: string
  export let hlsSrc: string
  export let hlsThumbnail = ''
  export let name: string | undefined = undefined
  export let preload = true

  let video: HTMLVideoElement | null = null
  let hls: HLS | null = null
  let player: Plyr | null = null

  const options: Plyr.Options = {}

  function initialize (src: string): void {
    if (video === null) {
      return
    }

    if (!HLS.isSupported()) {
      video.src = src
      player = new Plyr(video, options)
      return
    }
    const originalUrl = new URL(src)
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
      manifestLoadPolicy: loadPolicy,
      playlistLoadPolicy: loadPolicy,
      autoStartLoad: preload,
      xhrSetup: (xhr, url) => {
        const urlObj = new URL(url)
        if (urlObj.searchParams.size > 1) {
          return
        }
        const workspace = originalUrl.searchParams.get('workspace')
        if (workspace == null) {
          return
        }
        xhr.withCredentials = true
        const fileName = urlObj.href.substring(urlObj.href.lastIndexOf('/') + 1)
        urlObj.searchParams.append('file', fileName)
        urlObj.searchParams.append('workspace', workspace)
        xhr.open('GET', urlObj.toString(), true)
      }
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
<video bind:this={video} width="100%" height="100%" preload={preload ? 'auto' : 'none'} controls />

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
  @import 'plyr/dist/plyr.css';
</style>