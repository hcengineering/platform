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
  import type { Attachment } from '@hcengineering/attachment'

  import type { BlobType, WithLookup } from '@hcengineering/core'
  import { getFileUrl, getVideoMeta } from '@hcengineering/presentation'
  import { HlsVideo, Video } from '@hcengineering/ui'

  export let value: WithLookup<Attachment> | BlobType
  export let preload = false

  const maxSizeRem = 25
  const baseSizeRem = 20
  const minSizeRem = 10

  $: dimensions = getDimensions(value)
  $: name = value.name
  $: file = value.file

  function getDimensions (value: Attachment | BlobType): { width: number, height: number } {
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)

    if (!value.metadata) {
      const baseSize = baseSizeRem * fontSize
      return { width: baseSize, height: baseSize }
    }

    const { originalWidth, originalHeight } = value.metadata
    const maxSize = maxSizeRem * fontSize

    // For mp4 audio files, we don't have originalWidth, originalHeight
    if (originalWidth === 0 || originalHeight === 0) {
      return { width: maxSize, height: minSizeRem * fontSize }
    }

    const ratio = originalHeight / originalWidth

    const width = Math.min(maxSize, originalWidth)
    const height = width * ratio

    if (height > maxSize) {
      return { width: maxSize / ratio, height: maxSize }
    }

    return { width, height }
  }

  function toStyle (size: 'auto' | number): string {
    return size === 'auto' ? 'auto' : `${size}px`
  }
</script>

<div class="container" style="width:{toStyle(dimensions.width)}; height:{toStyle(dimensions.height)}">
  {#await getVideoMeta(file, name) then meta}
    {@const src = getFileUrl(file, name)}

    {#if meta?.hls?.source !== undefined}
      <HlsVideo {src} {preload} hlsSrc={meta.hls.source} hlsThumbnail={meta.hls.thumbnail} {name} />
    {:else}
      <Video {src} {name} preload />
    {/if}
  {/await}
</div>

<style lang="scss">
  .container {
    min-width: 10rem;
    min-height: 10rem;
    border-radius: 0.75rem;
  }
</style>
