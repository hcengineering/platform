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
  import { getIconSize2x, IconSize } from '@hcengineering/ui'
  import { getFileUrl } from '@hcengineering/presentation'
  import type { Attachment } from '@hcengineering/attachment'

  import { AttachmentImageSize } from '../types'

  export let value: Attachment
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
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<img
  src={getFileUrl(value.file, urlSize)}
  style:object-fit={getObjectFit(dimensions)}
  width={dimensions.width}
  height={dimensions.height}
  srcset={`${getFileUrl(value.file, urlSize, value.name)} 1x, ${getFileUrl(
    value.file,
    getIconSize2x(urlSize),
    value.name
  )} 2x`}
  alt={value.name}
/>

<style lang="scss">
  img {
    max-width: 20rem;
    max-height: 20rem;
    border-radius: 0.75rem;
    object-fit: contain;
    min-height: 4rem;
    min-width: 4rem;
  }
</style>
