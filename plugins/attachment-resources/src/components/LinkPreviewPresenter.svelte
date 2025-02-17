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
  import { getJsonOrEmpty, getClient, type LinkPreviewDetails } from '@hcengineering/presentation'
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
  let viewModel: LinkPreviewDetails | undefined
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
        refreshPreviewImage()
      })
      .catch((err) => {
        viewModel = undefined
        console.error(err)
      })
  })
</script>

<div class="content">
  {#if viewModel}
    <div class="title">
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
      <b><a class="link" target="_blank" href={viewModel.host}>{viewModel.hostname}</a></b>
      {#if isOwn}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span
          class="delete-button"
          tabindex="0"
          role="button"
          on:click={() => {
            void onDelete()
          }}><TrashIcon size="small" /></span
        >
      {/if}
    </div>
    <div class="description">
      {#if viewModel.title?.toLowerCase() !== viewModel.hostname?.toLowerCase()}
        <div>
          <b><a class="link" target="_blank" href={viewModel.url}>{viewModel.title}</a></b>
        </div>
      {/if}

      {#if viewModel.description}
        <div>
          {viewModel.description}
        </div>
      {/if}
    </div>
    {#if previewImageSrc}
      <div>
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
      </div>
    {/if}
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
    margin-top: 0.5rem;
    border-radius: 0.375rem;
    max-width: 24.5rem;
    max-height: 15rem;
  }
  .preview-icon {
    width: 16px;
    height: 16px;
  }
  .link {
    color: var(--theme-link-preview-text-color);
  }
  .title {
    gap: 0.375rem;
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .description {
    color: var(--theme-link-preview-description-color);
    overflow: hidden;
  }
  .content span {
    display: none;
  }
  .content:hover span {
    display: block;
  }
  .content {
    flex-direction: column;
    display: flex;
    line-height: 150%;
    gap: 0.188rem;
    padding: 0.75rem;
    background-color: var(--theme-link-preview-bg-color);
    border-radius: 0.75rem;
    scroll-snap-align: start;
    max-width: 26rem;
    max-height: 28rem;
    font-family: var(--font-family);
  }
</style>
