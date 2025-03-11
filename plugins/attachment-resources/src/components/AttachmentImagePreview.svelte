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
  import type { WithLookup } from '@hcengineering/core'
  import { Image } from '@hcengineering/presentation'
  import { Loading } from '@hcengineering/ui'

  import BrokenImage from './icons/BrokenImage.svelte'
  import { AttachmentImageSize } from '../types'

  export let value: WithLookup<Attachment>
  export let size: AttachmentImageSize = 'auto'

  interface Dimensions {
    width: number
    height: number
    fit: 'cover' | 'contain'
  }

  const minSizeRem = 4
  const maxSizeRem = 20

  const preferredWidthMap = {
    'x-large': 300
  } as const

  let dimensions: Dimensions

  $: dimensions = getDimensions(value, size)

  function getDimensions (value: Attachment, size: AttachmentImageSize): Dimensions {
    if (size === 'auto' || size == null) {
      return {
        width: 300,
        height: 300,
        fit: 'contain'
      }
    }

    const preferredWidth = preferredWidthMap[size]
    const { metadata } = value

    if (metadata === undefined) {
      return {
        width: preferredWidth,
        height: preferredWidth,
        fit: 'contain'
      }
    }

    const { originalWidth, originalHeight } = metadata
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
    const maxSize = maxSizeRem * fontSize
    const minSize = minSizeRem * fontSize

    const width = Math.min(originalWidth, preferredWidth)
    const ratio = originalHeight / originalWidth
    const height = Math.ceil(width * ratio)

    const fit = width < minSize || height < minSize ? 'cover' : 'contain'

    if (height > maxSize) {
      return {
        width: maxSize / ratio,
        height: maxSize,
        fit
      }
    } else if (height < minSize) {
      return {
        width,
        height: minSize,
        fit
      }
    } else {
      return {
        width,
        height,
        fit
      }
    }
  }

  function toStyle (size: 'auto' | number): string {
    return size === 'auto' ? 'auto' : `${size}px`
  }

  let loading = false
  let error = false

  function handleLoadStart (): void {
    loading = true
  }

  function handleLoad (): void {
    loading = false
  }

  function handleError (): void {
    loading = false
    error = true
  }
</script>

<div class="container" class:loading style="width:{toStyle(dimensions.width)}; height:{toStyle(dimensions.height)}">
  {#if loading}
    <div class="image-overlay">
      <Loading />
    </div>
  {/if}

  {#if error}
    <div class="image-overlay">
      <BrokenImage size={'large'} />
    </div>
  {/if}

  <Image
    blob={value.file}
    alt={value.name}
    fit={dimensions.fit}
    width={Math.ceil(dimensions.width)}
    height={Math.ceil(dimensions.height)}
    on:load={handleLoad}
    on:error={handleError}
    on:loadstart={handleLoadStart}
  />
</div>

<style lang="scss">
  .container {
    display: inline-flex;
    background-color: var(--theme-link-preview-bg-color);
    border-radius: 0.75rem;

    .image-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
  }
</style>
