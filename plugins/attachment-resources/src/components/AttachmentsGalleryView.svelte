<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Attachment } from '@anticrm/attachment'
  import { AttachmentGalleryPresenter } from '..'
  import AttachmentActions from './AttachmentActions.svelte'

  export let attachments: Attachment[]
  let selectedFileNumber: number | undefined
</script>

<div class="galleryGrid">
  {#each attachments as attachment, i}
    <div class="attachmentCell" class:fixed={i === selectedFileNumber}>
      <AttachmentGalleryPresenter value={attachment}>
        <svelte:fragment slot="rowMenu">
          <div class="eAttachmentCellActions" class:fixed={i === selectedFileNumber}>
            <AttachmentActions {attachment} />
          </div>
        </svelte:fragment>
      </AttachmentGalleryPresenter>
    </div>
  {/each}
</div>

<style lang="scss">
  .galleryGrid {
    display: grid;
    margin: 0 1.5rem;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  }

  .attachmentCell {
    .eAttachmentCellActions {
      visibility: hidden;
    }

    .eAttachmentCellMenu {
      visibility: hidden;
      margin-left: 0.2rem;
      opacity: 0.6;
      cursor: pointer;

      &:hover {
        opacity: 1;
      }
    }

    &:hover {
      .eAttachmentCellActions {
        visibility: visible;
      }
      .eAttachmentCellMenu {
        visibility: visible;
      }
    }
    &.fixed {
      .eAttachmentCellActions {
        visibility: visible;
      }
      .eAttachmentCellMenu {
        visibility: visible;
      }
    }
  }
</style>
