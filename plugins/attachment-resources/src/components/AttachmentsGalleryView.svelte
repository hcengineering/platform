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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { Doc, getCurrentAccount } from '@hcengineering/core'
  import { getFileUrl, getClient } from '@hcengineering/presentation'
  import { Icon, IconMoreV, showPopup, Menu } from '@hcengineering/ui'
  import FileDownload from './icons/FileDownload.svelte'
  import { AttachmentGalleryPresenter } from '..'

  export let attachments: Attachment[]
  let selectedFileNumber: number | undefined
  const myAccId = getCurrentAccount()._id
  const client = getClient()

  const showFileMenu = async (ev: MouseEvent, object: Doc, fileNumber: number): Promise<void> => {
    selectedFileNumber = fileNumber
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
        selectedFileNumber = undefined
      }
    )
  }
</script>

<div class="galleryGrid">
  {#each attachments as attachment, i}
    <div class="attachmentCell" class:fixed={i === selectedFileNumber}>
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <AttachmentGalleryPresenter value={attachment}>
        <svelte:fragment slot="rowMenu">
          <div class="eAttachmentCellActions" class:fixed={i === selectedFileNumber}>
            <a href={getFileUrl(attachment.file, 'full', attachment.name)} download={attachment.name}>
              <Icon icon={FileDownload} size={'small'} />
            </a>
            <div class="eAttachmentCellMenu" on:click={(event) => showFileMenu(event, attachment, i)}>
              <IconMoreV size={'small'} />
            </div>
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
      display: flex;
      visibility: hidden;
      padding: 0.5rem;
      background-color: var(--theme-comp-header-color);
      border: 1px solid var(--theme-divider-color);
      border-radius: 0.25rem;
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
