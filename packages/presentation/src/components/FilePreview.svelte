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
  import { type Blob } from '@hcengineering/core'
  import { Button, Component, Label, resizeObserver, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  import presentation from '../plugin'

  import { getPreviewType, previewTypes } from '../file'
  import { BlobMetadata, FilePreviewExtension } from '../types'

  import { getBlobSrcFor } from '../preview'

  export let file: Blob
  export let name: string
  export let metadata: BlobMetadata | undefined
  export let props: Record<string, any> = {}
  export let fit: boolean = false

  let download: HTMLAnchorElement
  let parentWidth: number
  let minHeight: number | undefined
  $: parentHeight = ($deviceInfo.docHeight * 80) / 100

  let previewType: FilePreviewExtension | undefined = undefined
  $: void getPreviewType(file.contentType, $previewTypes).then((res) => {
    previewType = res
  })

  const updateHeight = (
    pWidth: number,
    pHeight: number,
    pT: FilePreviewExtension | undefined,
    mD: BlobMetadata | undefined
  ): void => {
    if (fit) return
    if (pT === undefined || mD?.originalWidth === undefined || mD?.originalHeight === undefined) {
      minHeight = undefined
      return
    }
    if (pT.contentType === 'audio/*') {
      minHeight = $deviceInfo.fontSize * 3.375
      return
    }
    if (Array.isArray(pT.contentType) && pT.contentType[0] === 'application/pdf') {
      minHeight = parentHeight
      return
    }
    const pR: number = mD?.pixelRatio ?? 1
    const fWidth: number = mD.originalWidth / pR
    const fHeight: number = mD.originalHeight / pR
    let mHeight: number = 0
    let scale: number = 1
    if (fWidth > pWidth) {
      scale = fWidth / pWidth
      mHeight = fHeight / scale
    }
    if (fHeight > pHeight && fHeight / pHeight > scale) {
      scale = fHeight / pHeight
      mHeight = fHeight / scale
    }
    minHeight = scale === 1 ? fHeight : mHeight
  }
  $: updateHeight(parentWidth, parentHeight, previewType, metadata)
  $: audio = previewType && Array.isArray(previewType) && previewType[0].contentType === 'audio/*'
  $: srcRef = getBlobSrcFor(file, name)
</script>

<div
  use:resizeObserver={(element) => (parentWidth = element.clientWidth)}
  class="content w-full h-full"
  class:flex-center={fit && !audio}
  style:min-height={fit ? '100%' : `${minHeight ?? 0}px`}
>
  {#await srcRef then src}
    {#if src === ''}
      <div class="centered">
        <Label label={presentation.string.FailedToPreview} />
      </div>
    {:else if previewType !== undefined}
      <Component
        is={previewType.component}
        props={{ value: file, name, contentType: file.contentType, metadata, ...props, fit }}
      />
    {:else}
      <div class="centered flex-col flex-gap-3">
        <Label label={presentation.string.ContentTypeNotSupported} />
        <a class="no-line" href={src} download={name} bind:this={download}>
          <Button
            label={presentation.string.Download}
            kind={'primary'}
            on:click={() => {
              download.click()
            }}
            showTooltip={{ label: presentation.string.Download }}
          />
        </a>
      </div>
    {/if}
  {/await}
</div>

<style lang="scss">
  .content {
    flex-grow: 1;
    overflow: auto;
    border: none;
  }
</style>
