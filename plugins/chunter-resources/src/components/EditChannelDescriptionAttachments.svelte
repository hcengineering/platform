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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentPresenter, FileDownload } from '@hcengineering/attachment-resources'
  import { ChunterSpace } from '@hcengineering/chunter'
  import { Doc, SortingOrder, getCurrentAccount } from '@hcengineering/core'
  import { createQuery, getClient, getFileUrl } from '@hcengineering/presentation'
  import { Icon, IconMoreV, Label, Menu, getCurrentResolvedLocation, navigate, showPopup } from '@hcengineering/ui'

  export let channel: ChunterSpace | undefined
  const myAccId = getCurrentAccount()._id
  const client = getClient()

  const query = createQuery()
  let visibleAttachments: Attachment[] | undefined
  let totalAttachments = 0
  const ATTACHEMNTS_LIMIT = 5
  let selectedRowNumber: number | undefined
  const sort = { modifiedOn: SortingOrder.Descending }

  const showMenu = async (ev: MouseEvent, object: Doc, rowNumber: number): Promise<void> => {
    selectedRowNumber = rowNumber
    showPopup(
      Menu,
      {
        actions: [
          ...(myAccId === object.modifiedBy
            ? [
                {
                  label: attachment.string.DeleteFile,
                  action: async () => await client.removeDoc(object._class, object.space, object._id)
                }
              ]
            : [])
        ]
      },
      ev.target as HTMLElement,
      () => {
        selectedRowNumber = undefined
      }
    )
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
      {
        limit: ATTACHEMNTS_LIMIT,
        sort,
        total: true
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
            <a href={getFileUrl(attachment.file, 'full', attachment.name)} download={attachment.name}>
              <Icon icon={FileDownload} size={'small'} />
            </a>
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div id="context-menu" class="eAttachmentRowMenu" on:click={(event) => showMenu(event, attachment, i)}>
              <IconMoreV size={'small'} />
            </div>
          </div>
        </div>
      {/each}
      {#if visibleAttachments.length < totalAttachments}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
          class="showMoreAttachmentsButton"
          on:click={() => {
            const loc = getCurrentResolvedLocation()
            loc.path[3] = 'fileBrowser'
            loc.query = channel ? { spaceId: channel._id } : {}
            navigate(loc)
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
    padding: 1rem 0;
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
  }

  .eGroupTitle {
    margin: 0 1.25rem 0.5rem;
    display: flex;
    font-weight: 500;
    font-size: 1rem;
    color: var(--caption-color);
    justify-content: space-between;
  }

  .showMoreAttachmentsButton {
    margin-left: 1.5rem;
    margin-top: 0.5rem;
    color: var(--caption-color);
    cursor: pointer;
    &:hover {
      text-decoration: underline;
    }
  }

  .attachmentRow {
    display: flex;
    align-items: center;
    padding-right: 1rem;
    margin: 0 1.5rem;
    padding: 0.375rem 0;

    .eAttachmentRowActions {
      display: flex;
      visibility: hidden;
      border: 1px solid var(--divider-color);
      padding: 0.2rem;
      border-radius: 0.375em;
    }

    .eAttachmentRowMenu {
      margin-left: 0.2rem;
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
