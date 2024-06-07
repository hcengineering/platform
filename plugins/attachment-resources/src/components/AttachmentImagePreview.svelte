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
  import { getBlobRef, sizeToWidth } from '@hcengineering/presentation'
  import { IconSize } from '@hcengineering/ui'

  import type { WithLookup } from '@hcengineering/core'
  import { AttachmentImageSize } from '../types'

  export let value: WithLookup<Attachment>
  export let size: AttachmentImageSize = 'auto'

  interface Dimensions {
    width: 'auto' | number
    height: 'auto' | number
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
        height: 'auto'
      }
    }

    const preferredWidth = preferredWidthMap[size]
    const { metadata } = value

    if (!metadata) {
      return {
        width: preferredWidth,
        height: preferredWidth
      }
    }

    const { originalWidth, originalHeight } = metadata
    const maxSize = maxSizeRem * parseFloat(getComputedStyle(document.documentElement).fontSize)

    const width = Math.min(originalWidth, preferredWidth)
    const ratio = originalHeight / originalWidth
    const height = width * ratio

    if (height > maxSize) {
      return {
        width: maxSize / ratio,
        height: maxSize
      }
    }

    return {
      width,
      height
    }
  }

  function getObjectFit (size: Dimensions): 'contain' | 'cover' {
    if (size.width === 'auto' || size.height === 'auto') {
      return 'contain'
    }

    const minSize = minSizeRem * parseFloat(getComputedStyle(document.documentElement).fontSize)

    if (size.width < minSize || size.height < minSize) {
      return 'cover'
    }

    return 'contain'
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
</script>

<div class="container" style="width:{toStyle(dimensions.width)}; height:{toStyle(dimensions.height)}">
  {#await getBlobRef(value.$lookup?.file, value.file, value.name, sizeToWidth(urlSize)) then blobSrc}
    <img
      src={blobSrc.src}
      style:object-fit={getObjectFit(dimensions)}
      width={dimensions.width}
      height={dimensions.height}
      srcset={blobSrc.srcset}
      alt={value.name}
    />
  {/await}
</div>

<style lang="scss">
  img {
    max-width: 20rem;
    max-height: 20rem;
    border-radius: 0.75rem;
    object-fit: contain;
    min-height: 4rem;
    min-width: 4rem;
  }

  .container {
    display: inline-flex;
  }
</style>
