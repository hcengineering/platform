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
  import { getJsonOrEmpty, type LinkPreviewDetails } from '@hcengineering/presentation'
  import { type Attachment } from '@hcengineering/attachment'
  import { type WithLookup } from '@hcengineering/core'
  import { Spinner } from '@hcengineering/ui'

  export let attachment: WithLookup<Attachment>
  let useDefaultIcon = false
  let viewModel: LinkPreviewDetails
  void getJsonOrEmpty(attachment.file, attachment.name).then((res) => {
    viewModel = res as LinkPreviewDetails
  })
</script>

<div class="quote content">
  {#if viewModel}
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
          <svg class="preview-icon" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M14 0.000244141C11.2311 0.000244141 8.52431 0.82133 6.22202 2.35967C3.91973 3.89801 2.12532 6.08451 1.06569 8.64268C0.00606596 11.2008 -0.271181 14.0158 0.269012 16.7315C0.809205 19.4472 2.14258 21.9418 4.10051 23.8997C6.05845 25.8577 8.55301 27.191 11.2687 27.7312C13.9845 28.2714 16.7994 27.9942 19.3576 26.9346C21.9157 25.8749 24.1022 24.0805 25.6406 21.7782C27.1789 19.4759 28 16.7692 28 14.0002C28 10.2872 26.525 6.72626 23.8995 4.10075C21.274 1.47524 17.713 0.000244141 14 0.000244141ZM26 13.0002H20C19.8833 9.31733 18.9291 5.70939 17.21 2.45024C19.5786 3.09814 21.6914 4.45709 23.2632 6.34367C24.8351 8.23024 25.7903 10.5536 26 13.0002ZM14 26.0002C13.7769 26.0152 13.5531 26.0152 13.33 26.0002C11.2583 22.6964 10.1085 18.8984 10 15.0002H18C17.9005 18.8956 16.7612 22.6934 14.7 26.0002C14.467 26.0166 14.2331 26.0166 14 26.0002ZM10 13.0002C10.0995 9.10492 11.2388 5.30707 13.3 2.00024C13.7453 1.95021 14.1947 1.95021 14.64 2.00024C16.7223 5.30104 17.8825 9.09931 18 13.0002H10ZM10.76 2.45024C9.0513 5.71189 8.10746 9.31969 8.00001 13.0002H2.00001C2.20971 10.5536 3.16495 8.23024 4.7368 6.34367C6.30865 4.45709 8.42144 3.09814 10.79 2.45024H10.76ZM2.05001 15.0002H8.05001C8.15437 18.68 9.09478 22.2878 10.8 25.5502C8.43887 24.8954 6.33478 23.5334 4.77056 21.6474C3.20634 19.7614 2.25695 17.4418 2.05001 15.0002ZM17.21 25.5502C18.9291 22.2911 19.8833 18.6832 20 15.0002H26C25.7903 17.4469 24.8351 19.7702 23.2632 21.6568C21.6914 23.5434 19.5786 24.9023 17.21 25.5502Z"
              fill="black"
            />
          </svg>
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
