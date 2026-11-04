<!--
// Copyright © 2024 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { BlobMetadata, type Blob, type Ref } from '@hcengineering/core'
  import {
    Button,
    Component,
    Label,
    resizeObserver,
    deviceOptionsStore as deviceInfo,
    Loading,
    trackRenderResource
  } from '@hcengineering/ui'

  import { onDestroy } from 'svelte'
  import { getResource } from '@hcengineering/platform'

  import presentation from '../plugin'

  import { getFileUrl } from '../file'
  import { getPreviewType, previewTypes } from '../filetypes'
  import { getPreviewThumbnail } from '../preview'
  import { imageSizeToRatio } from '../image'
  import { FilePreviewExtension } from '../types'

  export let file: Ref<Blob> | string
  export let name: string
  export let contentType: string
  export let metadata: BlobMetadata | undefined
  export let props: Record<string, any> = {}
  export let fit: boolean = false
  export let embedded: boolean = false
  export let setLoading: ((loading: boolean) => void) | undefined = undefined

  let download: HTMLAnchorElement
  let parentWidth: number
  let minHeight: number | undefined
  $: parentHeight = ($deviceInfo.docHeight * 80) / 100

  let loading = true
  let previewType: FilePreviewExtension | undefined = undefined
  let failed = false
  let generation = 0
  onDestroy(() => {
    generation++
  })

  function failedPreview (): void {
    generation++
    failed = true
    loading = false
  }

  const trackLoading = trackRenderResource({ timeoutMs: 15000, onTimeout: failedPreview })
  $: trackLoading(loading)

  async function resolvePreview (
    _file: string,
    _name: string,
    contentType: string,
    types: FilePreviewExtension[]
  ): Promise<void> {
    const request = ++generation
    loading = true
    failed = false
    try {
      const type = await getPreviewType(contentType, types)
      if (type !== undefined) await getResource(type.component)
      if (request !== generation) return
      previewType = type
      loading = false
    } catch {
      if (request === generation) failedPreview()
    }
  }
  $: void resolvePreview(file, name, contentType, $previewTypes)

  // For types we cannot render inline (e.g. pptx) the preview service may still
  // have generated a thumbnail image - show it in higher quality instead of just download.
  $: thumbnail = metadata?.thumbnail
  $: thumbnailFile = typeof file === 'string' && !file.includes('://') ? file : undefined
  let hiResLoaded = false
  $: if (thumbnailFile !== undefined) hiResLoaded = false

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
    const fWidth: number = imageSizeToRatio(mD.originalWidth, pR)
    const fHeight: number = imageSizeToRatio(mD.originalHeight, pR)
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
  $: srcRef = getFileUrl(file, name)
</script>

<div
  use:resizeObserver={(element) => (parentWidth = element.clientWidth)}
  class:content-default={!embedded}
  class:content-embedded={embedded}
  class:flex-center={fit && !audio}
  on:contextmenu
  style:min-height={fit ? '0' : `${minHeight ?? 0}px`}
>
  {#if failed}
    <Label label={presentation.string.FailedToPreview} />:
    {#if typeof props.sourceLink === 'string'}<a href={props.sourceLink}>{name}</a>{:else}{name}{/if}
  {:else}
    {#await srcRef then src}
      {#if src === ''}
        <div class="flex-col items-center">
          <Label label={presentation.string.FailedToPreview} />
        </div>
      {:else if previewType !== undefined}
        <Component
          is={previewType.component}
          props={{ value: file, name, contentType, metadata, ...props, fit, setLoading }}
        />
      {:else if loading}
        <Loading />
      {:else if thumbnail !== undefined && thumbnailFile !== undefined}
        <div class="flex-col items-center flex-gap-3">
          <div
            class="thumbnail-wrap"
            style:aspect-ratio={`${thumbnail.width} / ${thumbnail.height}`}
            style:width={`min(100%, ${thumbnail.width}px)`}
          >
            <!-- Hi-res defines the box; low-res is a blurred placeholder shown until it loads -->
            {#if !hiResLoaded}
              <img class="thumbnail low-res" src={getPreviewThumbnail(thumbnailFile, 64, 64, 1)} alt={name} />
              <div class="thumbnail-loader"><Loading /></div>
            {/if}
            <img
              class="thumbnail hi-res"
              class:loaded={hiResLoaded}
              src={getPreviewThumbnail(thumbnailFile, thumbnail.width, thumbnail.height, 1)}
              srcset={`${getPreviewThumbnail(thumbnailFile, thumbnail.width, thumbnail.height, 2)} 2x, ${getPreviewThumbnail(thumbnailFile, thumbnail.width, thumbnail.height, 3)} 3x`}
              alt={name}
              on:load={() => (hiResLoaded = true)}
            />
          </div>
          <a class="no-line" href={src} download={name} bind:this={download}>
            <Button
              label={presentation.string.Download}
              noPrint
              kind="ghost"
              on:click={() => {
                download.click()
              }}
              showTooltip={{ label: presentation.string.Download }}
            />
          </a>
        </div>
      {:else}
        <div class="flex-col items-center flex-gap-3">
          <Label label={presentation.string.ContentTypeNotSupported} />
          <a class="no-line" href={src} download={name} bind:this={download}>
            <Button
              label={presentation.string.Download}
              noPrint
              kind="primary"
              on:click={() => {
                download.click()
              }}
              showTooltip={{ label: presentation.string.Download }}
            />
          </a>
        </div>
      {/if}
    {/await}
  {/if}
</div>

<style lang="scss">
  .content-default {
    flex-grow: 1;
    overflow: auto;
    border: none;
    width: 100%;
    height: 100%;
  }

  .content-embedded {
    width: 100%;
    border: none;
  }

  @media print {
    .content-default,
    .content-embedded {
      height: auto;
      min-height: 0 !important;
      overflow: visible;
      break-inside: avoid;
    }
  }

  .thumbnail-wrap {
    position: relative;
    display: flex;
    max-width: 100%;
    max-height: 70vh;
    border-radius: 0.5rem;
    overflow: hidden;
  }

  .thumbnail {
    object-fit: contain;
  }

  .thumbnail.low-res {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: blur(12px);
  }

  .thumbnail.hi-res {
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.2s ease-in;

    &.loaded {
      opacity: 1;
    }
  }

  .thumbnail-loader {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
</style>
