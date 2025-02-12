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
  import { getBlobRef, sizeToWidth } from '@hcengineering/presentation'
  import { IconSize, Loading } from '@hcengineering/ui'

  import BrokenImage from './icons/BrokenImage.svelte'
  import { AttachmentImageSize } from '../types'

  export let value: WithLookup<Attachment>
  export let size: AttachmentImageSize = 'auto'

  interface Dimensions {
    width: 'auto' | number
    height: 'auto' | number
    fit: 'cover' | 'contain'
  }

  const minSizeRem = 4
  const maxSizeRem = 20

  const preferredWidthMap = {
    'x-large': 300
  } as const

  let dimensions: Dimensions
  let urlSize: IconSize

  $: dimensions = getDimensions(value, size)
  $: urlSize = getUrlSize(size)

  function getDimensions (value: Attachment, size: AttachmentImageSize): Dimensions {
    if (size === 'auto') {
      return {
        width: 'auto',
        height: 'auto',
        fit: 'contain'
      }
    }

    const preferredWidth = preferredWidthMap[size]
    const { metadata } = value

    if (!metadata) {
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
    const height = width * ratio

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

  function getUrlSize (size: AttachmentImageSize): IconSize {
    if (size === 'auto') {
      return 'large'
    }

    return 'x-large'
  }

  function toStyle (size: 'auto' | number): string {
    return size === 'auto' ? 'auto' : `${size}px`
  }

  let loading = false
  let error = false

  $: if (value !== undefined) {
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
      <BrokenImage size={'x-large'} />
    </div>
  {/if}

  {#await getBlobRef(value.file, value.name, sizeToWidth(urlSize)) then blobSrc}
    <img
      src={blobSrc.src}
      style:object-fit={dimensions.fit}
      style:visibility={error ? 'hidden' : 'visible'}
      width="100%"
      height="100%"
      srcset={blobSrc.srcset}
      alt={value.name}
      on:load={handleLoad}
      on:error={handleError}
    />
  {/await}
</div>

<style lang="scss">
  img {
    max-width: 20rem;
    max-height: 20rem;
    border-radius: 0.75rem;
    min-height: 4rem;
    min-width: 4rem;

    background-color: var(--theme-link-preview-bg-color);
  }

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
