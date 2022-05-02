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
  import { AttachmentPresenter } from '..'
  import AttachmentActions from './AttachmentActions.svelte'

  export let attachments: Attachment[]
  let selectedFileNumber: number | undefined
</script>

<div class="flex-col">
  {#each attachments as attachment, i}
    <div class="flex-between attachmentRow" class:fixed={i === selectedFileNumber}>
      <div class="item flex">
        <AttachmentPresenter value={attachment} />
      </div>
      <div class="eAttachmentRowActions" class:fixed={i === selectedFileNumber}>
        <AttachmentActions {attachment} />
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .attachmentRow {
    display: flex;
    position: relative;
    align-items: center;
    margin: 0.5rem 1.5rem;
    padding: 0.5rem;
    border: 1px solid var(--theme-button-border-hovered);
    border-radius: 0.5rem;

    .eAttachmentRowActions {
      visibility: hidden;
    }

    &:hover {
      .eAttachmentRowActions {
        visibility: visible;
      }
    }
    &.fixed {
      .eAttachmentRowActions {
        visibility: visible;
      }
    }
  }
</style>
