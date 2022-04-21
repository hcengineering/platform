<!--
//
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
  import attachment, { Attachment } from '@anticrm/attachment'
  import { AttachmentPresenter } from '@anticrm/attachment-resources'
  import { Channel } from '@anticrm/chunter'
  import { Doc, SortingOrder } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Menu } from '@anticrm/view-resources'
  import { showPopup, IconMoreV, Label } from '@anticrm/ui'

  export let channel: Channel | undefined

  const query = createQuery()
  let visibleAttachments: Attachment[] | undefined
  let totalAttachments = 0
  let attachmentsLimit: number | undefined = 5
  let selectedRowNumber: number | undefined
  const sort = { modifiedOn: SortingOrder.Descending }

  const showMenu = async (ev: MouseEvent, object: Doc, rowNumber: number): Promise<void> => {
    selectedRowNumber = rowNumber
    showPopup(Menu, { object }, ev.target as HTMLElement, () => {
      selectedRowNumber = undefined
    })
  }

  $: channel &&
    query.query(
      attachment.class.Attachment,
      {
        space: channel._id
      },
      (res) => {
        visibleAttachments = res
        totalAttachments = res.total
      },
      attachmentsLimit
        ? {
            limit: attachmentsLimit,
            sort: sort
          }
        : {
            sort: sort
          }
    )
</script>

<div class="group">
  <div class="eGroupTitle"><Label label={attachment.string.Files} /></div>
  {#if visibleAttachments?.length}
    <div class="flex-col">
      {#each visibleAttachments as attachment, i}
        <div class="flex-between attachmentRow" class:fixed={i === selectedRowNumber}>
          <div class="item flex">
            <AttachmentPresenter value={attachment} />
          </div>
          <div class="eAttachmentRowActions" class:fixed={i === selectedRowNumber}>
            <div id="context-menu" class="eAttachmentRowMenu" on:click={(event) => showMenu(event, attachment, i)}>
              <IconMoreV size={'small'} />
            </div>
          </div>
        </div>
      {/each}
      {#if attachmentsLimit && visibleAttachments.length < totalAttachments}
        <div
          class="showMoreAttachmentsButton"
          on:click={() => {
            // TODO: replace this with an external attachments page
            attachmentsLimit = undefined
          }}
        >
          <Label label={attachment.string.ShowMoreAttachments} />
        </div>
      {/if}
    </div>
  {:else}
    <div class="flex-between attachmentRow">
      <Label label={attachment.string.NoFiles} />
    </div>
  {/if}
</div>

<style lang="scss">
  .group {
    border: 1px solid var(--theme-button-border-hovered);
    border-radius: 12px;
    padding: 16px 0;
  }

  .eGroupTitle {
    margin: 0 20px 8px 20px;
    display: flex;
    font-weight: 500;
    font-size: 1rem;
    color: var(--theme-caption-color);
    justify-content: space-between;
  }

  .showMoreAttachmentsButton {
    margin-left: 20px;
    margin-top: 8px;
    color: var(--theme-caption-color);
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }

  .attachmentRow {
    display: flex;
    align-items: center;
    padding-right: 1rem;
    margin: 0 20px;
    padding: 5px 0;

    .eAttachmentRowActions {
      visibility: hidden;
      border: 1px solid var(--theme-bg-focused-border);
      padding: 0.2rem;
      border-radius: 0.375em;
    }

    .eAttachmentRowMenu {
      visibility: hidden;
      opacity: 0.6;
      cursor: pointer;

      &:hover {
        opacity: 1;
      }
    }

    &:hover {
      .eAttachmentRowActions {
        visibility: visible;
      }
      .eAttachmentRowMenu {
        visibility: visible;
      }
    }
    &.fixed {
      .eAttachmentRowActions {
        visibility: visible;
      }
      .eAttachmentRowMenu {
        visibility: visible;
      }
    }
  }
</style>
