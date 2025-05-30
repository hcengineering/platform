<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'

  import TrashIcon from './icons/Trash.svelte'
  import { getImageDimensions } from '../utils'
  import LinkPreviewIcon from './LinkPreviewIcon.svelte'
  import LinkPreviewImage from './LinkPreviewImage.svelte'
  import { LinkPreviewData } from '../types'

  export let linkPreview: LinkPreviewData
  export let isOwn = false

  const dispatch = createEventDispatcher()

  $: description = linkPreview.description
  $: title = linkPreview.title
  $: icon = linkPreview.icon
  $: image = linkPreview.image
  $: host = linkPreview.host
  $: hostname = linkPreview.hostname
  $: url = linkPreview.url

  $: imageDimensions =
    linkPreview.imageWidth && linkPreview.imageHeight
      ? getImageDimensions(
        { width: linkPreview.imageWidth, height: linkPreview.imageHeight },
        {
          maxWidth: 23.5,
          minWidth: 4,
          maxHeight: 15,
          minHeight: 4
        }
      )
      : undefined
</script>

<div class="link-preview">
  <div class="link-preview__header">
    <LinkPreviewIcon src={icon} />
    {#if host}
      <b class="overflow-label"><a class="link" target="_blank" href={host}>{hostname}</a></b>
    {/if}
    {#if isOwn}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div class="link-preview__delete-button" tabindex="0" role="button" on:click={() => dispatch('delete')}>
        <TrashIcon size="small" />
      </div>
    {/if}
  </div>
  <div class="link-preview__body">
    {#if title && title.toLowerCase() !== (hostname ?? '').toLowerCase()}
      {#if url}
        <b><a class="link" target="_blank" href={url}>{title}</a></b>
      {:else}
        <b>{title}</b>
      {/if}
    {/if}
    {#if description && description !== ''}
      <span class="link-preview__description lines-limit-4">
        {description}
      </span>
    {/if}
  </div>
  {#if image}
    <LinkPreviewImage
      {url}
      src={image}
      width={imageDimensions?.width ?? 300}
      height={imageDimensions?.height ?? 170}
      fit={imageDimensions?.fit ?? 'contain'}
    />
  {/if}
</div>

<style lang="scss">
  .link-preview {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    line-height: 150%;
    padding: 0.75rem;
    background-color: var(--theme-link-preview-bg-color);
    border-radius: 0.75rem;
    scroll-snap-align: start;
    max-width: 26rem;
    min-width: 16rem;

    &:hover {
      .link-preview__delete-button {
        visibility: visible;
      }
    }
  }

  .link-preview__header {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.375rem;
    height: 1.375rem;
  }

  .link-preview__delete-button {
    margin-left: auto;
    cursor: pointer;
    visibility: hidden;

    &:not(:hover) {
      color: var(--theme-link-preview-description-color);
    }
  }

  .link-preview__body {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    overflow: hidden;
  }

  .link-preview__description {
    color: var(--theme-link-preview-description-color);
    overflow: hidden;
  }

  .link {
    color: var(--theme-link-preview-text-color);
  }
</style>
