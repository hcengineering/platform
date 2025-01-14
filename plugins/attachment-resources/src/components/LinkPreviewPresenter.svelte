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
  import { getJsonOrEmpty, type LinkPreviewDetails, canDisplayLinkPreview } from '@hcengineering/presentation'
  import { type Attachment } from '@hcengineering/attachment'
  import { type WithLookup } from '@hcengineering/core'
  import { Spinner } from '@hcengineering/ui'
  import WebIcon from './icons/Web.svelte'

  export let attachment: WithLookup<Attachment>
  let useDefaultIcon = false
  let viewModel: LinkPreviewDetails
  let canDisplay = false

  void getJsonOrEmpty(attachment.file, attachment.name).then((res) => {
    viewModel = res as LinkPreviewDetails
    canDisplay = canDisplayLinkPreview(viewModel)
  })
</script>

<div class="quote content">
  {#if canDisplay}
    <div class="gapV-2">
      <div class="flex gap-1">
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
          <WebIcon size="medium" />
        {/if}
        <b><a target="_blank" href={viewModel.host}>{viewModel.hostname}</a></b>
      </div>
      <div>
        <div>
          {#if viewModel.title?.toLowerCase() !== viewModel.hostname?.toLowerCase()}
            <b><a target="_blank" href={viewModel.url}>{viewModel.title}</a></b>
          {/if}
        </div>
        <div>
          {#if viewModel.description}
            {viewModel.description}
          {/if}
          {#if viewModel.image}
            <a target="_blank" href={viewModel.url}>
              <img src={viewModel.image} class="round-image" alt="link-preview" />
            </a>
          {/if}
        </div>
      </div>
    </div>
  {:else}
    <div class="centered">
      <Spinner size="medium" />
    </div>
  {/if}
</div>

<style lang="scss">
  .round-image {
    border: 0.5px solid;
    border-radius: 7px;
    max-width: 25rem;
    max-height: 25rem;
  }
  .preview-icon {
    max-width: 22px;
    max-height: 22px;
  }
  .quote {
    border-left: 0.25rem solid;
    padding-left: 15px;
  }
  .content {
    max-width: 35rem;
    max-height: 35rem;
  }
</style>
