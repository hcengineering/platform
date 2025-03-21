<!-- //
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
// -->
<script lang="ts">
  import {
    getJsonOrEmpty,
    getClient,
    type LinkPreviewDetails,
    LinkPreviewAttachmentMetadata
  } from '@hcengineering/presentation'
  import { type Attachment } from '@hcengineering/attachment'
  import { type WithLookup } from '@hcengineering/core'
  import { onMount } from 'svelte'

  import TrashIcon from './icons/Trash.svelte'
  import { getImageDimensions } from '../utils'
  import LinkPreviewIcon from './LinkPreviewIcon.svelte'
  import LinkPreviewImage from './LinkPreviewImage.svelte'

  export let attachment: WithLookup<Attachment>
  export let isOwn = false

  let viewModel: LinkPreviewDetails | undefined

  let metadata: LinkPreviewAttachmentMetadata | undefined
  $: metadata = attachment.metadata

  const client = getClient()

  async function onDelete (): Promise<void> {
    await client.removeCollection(
      attachment._class,
      attachment.space,
      attachment._id,
      attachment.attachedTo,
      attachment.attachedToClass,
      'attachments'
    )
  }

  onMount(() => {
    void getJsonOrEmpty<LinkPreviewDetails>(attachment.file, attachment.name)
      .then((res) => {
        viewModel = res
      })
      .catch((err) => {
        viewModel = undefined
        console.error(err)
      })
  })

  $: description = viewModel?.description ?? metadata?.description
  $: title = viewModel?.title ?? metadata?.title
  $: icon = viewModel?.icon
  $: image = viewModel?.image ?? metadata?.image
  $: host = viewModel?.host
  $: hostname = viewModel?.hostname
  $: url = viewModel?.url

  $: imageDimensions =
    metadata?.imageWidth && metadata.imageHeight
      ? getImageDimensions(
        { width: metadata.imageWidth, height: metadata.imageHeight },
        {
          maxWidth: 24.5,
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
      <div class="link-preview__delete-button" tabindex="0" role="button" on:click={onDelete}>
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
