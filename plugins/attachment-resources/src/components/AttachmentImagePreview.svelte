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
  import { Image } from '@hcengineering/presentation'
  import { Loading } from '@hcengineering/ui'

  import BrokenImage from './icons/BrokenImage.svelte'
  import { AttachmentImageSize } from '../types'
  import { getImageDimensions } from '../utils'

  export let value: WithLookup<Attachment> | BlobType
  export let size: AttachmentImageSize = 'auto'

  interface Dimensions {
    width: number
    height: number
    fit: 'cover' | 'contain'
  }

  const minSizeRem = 4
  const maxSizeRem = 20

  let dimensions: Dimensions

  $: dimensions = getDimensions(value, size)

  function getDimensions (value: Attachment | BlobType, size: AttachmentImageSize): Dimensions {
    const byDefault = { width: 300, height: 300, fit: 'contain' } as const
    if (size === 'auto' || size == null) return byDefault

    const { metadata } = value
    if (metadata === undefined) return byDefault

    return getImageDimensions(
      {
        width: metadata.originalWidth,
        height: metadata.originalHeight
      },
      { maxWidth: maxSizeRem, minWidth: minSizeRem, maxHeight: maxSizeRem, minHeight: minSizeRem }
    )
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
    width={dimensions.width}
    height={dimensions.height}
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
