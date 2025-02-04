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
    type LinkPreviewDetails
  } from '@hcengineering/presentation'
  import { type Attachment } from '@hcengineering/attachment'
  import { type WithLookup } from '@hcengineering/core'
  import { Spinner } from '@hcengineering/ui'
  import WebIcon from './icons/Web.svelte'
  import { onMount } from 'svelte'
  import TrashIcon from './icons/Trash.svelte'

  export let attachment: WithLookup<Attachment>
  export let isOwn = false

  let useDefaultIcon = false
  let retryCount = 0
  let viewModel: LinkPreviewDetails
  let previewImageSrc: string | undefined

  function refreshPreviewImage (): void {
    if (viewModel?.image === undefined) {
      return
    }
    if (retryCount > 3) {
      previewImageSrc = undefined
      return
    }
    retryCount++
    previewImageSrc = `${viewModel.image}#${Date.now()}`
  }
  const client = getClient()

  async function onDelete (): void {
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
    void getJsonOrEmpty(attachment.file, attachment.name)
      .then((res) => {
        viewModel = res as LinkPreviewDetails
        refreshPreviewImage()
      })
      .catch((err) => {
        console.error(err)
      })
  })
</script>

<div class="content">
  {#if viewModel}
    <div class="flex-row-center title">
      {#if viewModel.icon !== undefined && !useDefaultIcon}
        <img
          src={viewModel.icon}
          class="preview-icon"
          alt="link-preview-icon"
          on:error={() => {
            useDefaultIcon = true
          }}
        />
      {:else}
        <WebIcon size="small" />
      {/if}
      <b><a target="_blank" href={viewModel.host}>{viewModel.hostname}</a></b>
      {#if isOwn}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span
          class="delete-button"
          tabindex="0"
          role="button"
          on:click={() => {
            onDelete()
          }}><TrashIcon size="small" /></span
        >
      {/if}
    </div>
    <div class="description text-markup-view">
      {#if viewModel.title?.toLowerCase() !== viewModel.hostname?.toLowerCase()}
        <b><a target="_blank" href={viewModel.url}>{viewModel.title}</a></b>
      {/if}
      {#if viewModel.description}
        {viewModel.description}
      {/if}
      {#if previewImageSrc}
        <a target="_blank" href={viewModel.url}>
          <img
            src={previewImageSrc}
            class="round-image"
            alt="link-preview"
            on:error={() => {
              refreshPreviewImage()
            }}
          />
        </a>
      {/if}
    </div>
  {:else}
    <div class="centered">
      <Spinner size="medium" />
    </div>
  {/if}
</div>

<style lang="scss">
  .delete-button {
    margin-left: auto;
    cursor: pointer;
  }
  .delete-button:not(:hover) {
    color: var(--theme-link-preview-description-color);
  }
  .round-image {
    border-radius: 6px;
    max-width: 24.5rem;
    max-height: 13rem;
  }
  .preview-icon {
    width: 16px;
    height: 16px;
  }
  .title {
    gap: 6px;
  }
  .description {
    flex-direction: column;
    display: flex;
    align-items: flex-start;
    gap: 4 px;
    color: var(--theme-link-preview-description-color);
  }
  .content span {
    display: none;
  }
  .content:hover span {
    display: block;
  }
  .content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background-color: var(--theme-link-preview-bg-color);
    border-radius: 12px;
    scroll-snap-align: start;
    max-width: 26rem;
    max-height: 26rem;
    font-family: var(--font-family);
  }
</style>
