<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { type Blob, type BlobMetadata, type Ref } from '@hcengineering/core'
  import { getFileUrl, getVideoMeta } from '@hcengineering/presentation'
  import { onDestroy } from 'svelte'
  import HLS from 'hls.js'

  export let value: Ref<Blob>
  export let name: string
  export let metadata: BlobMetadata | undefined
  export let fit: boolean = false

  let video: HTMLVideoElement
  let hls: HLS

  async function fetchVideoMeta (value: Ref<Blob>, name: string): Promise<void> {
    const src = getFileUrl(value, name)
    const meta = await getVideoMeta(value, name)
    if (meta != null && meta.status === 'ready' && HLS.isSupported()) {
      hls?.destroy()
      hls = new HLS()
      hls.loadSource(meta.hls)
      hls.attachMedia(video)
      video.poster = meta.thumbnail
    } else {
      video.src = src
    }
  }

  onDestroy(() => {
    hls?.destroy()
  })

  $: aspectRatio =
    metadata?.originalWidth && metadata?.originalHeight
      ? `${metadata.originalWidth} / ${metadata.originalHeight}`
      : '16 / 9'
  $: maxWidth = metadata?.originalWidth ? `min(${metadata.originalWidth}px, 100%)` : undefined
  $: maxHeight = metadata?.originalHeight ? `min(${metadata.originalHeight}px, 80vh)` : undefined
  $: void fetchVideoMeta(value, name)
</script>

<video
  bind:this={video}
  width="100%"
  style:aspect-ratio={aspectRatio}
  style:max-width={fit ? '100%' : maxWidth}
  style:max-height={fit ? '100%' : maxHeight}
  controls
  preload={'auto'}
>
  <track kind="captions" label={name} />
</video>
