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
  import { getFileUrl } from '@hcengineering/presentation'
  import AttachmentPresenter from './AttachmentPresenter.svelte'

  export let value: WithLookup<Attachment> | BlobType
  export let preload = true

  const maxSizeRem = 20
  const baseSizeRem = 12
  const minSizeRem = 4

  $: dimensions = getDimensions(value)

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
</script>

<video controls width={dimensions.width} height={dimensions.height} preload={preload ? 'auto' : 'none'}>
  <source src={getFileUrl(value.file, value.name)} />
  <track kind="captions" label={value.name} />
  <div class="container">
    <AttachmentPresenter {value} />
  </div>
</video>

<style lang="scss">
  video {
    max-width: 20rem;
    max-height: 20rem;
    min-width: 4rem;
    min-height: 4rem;
    border-radius: 0.75rem;
  }
</style>
