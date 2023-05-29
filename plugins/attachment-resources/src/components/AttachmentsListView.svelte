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
  import { AttachmentPresenter } from '..'

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

<div class="flex-col">
  {#each attachments as attachment, i}
    <div class="flex-between attachmentRow" class:fixed={i === selectedFileNumber}>
      <div class="item flex">
        <AttachmentPresenter value={attachment} />
      </div>
      <div class="eAttachmentRowActions" class:fixed={i === selectedFileNumber}>
        <a href={getFileUrl(attachment.file, 'full', attachment.name)} download={attachment.name}>
          <Icon icon={FileDownload} size={'small'} />
        </a>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div class="eAttachmentRowMenu" on:click={(event) => showFileMenu(event, attachment, i)}>
          <IconMoreV size={'small'} />
        </div>
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .attachmentRow {
    display: flex;
    align-items: center;
    margin: 0.5rem 1.5rem;
    padding: 0.5rem;
    border: 1px solid var(--divider-color);
    border-radius: 0.5rem;

    .eAttachmentRowActions {
      display: flex;
      visibility: hidden;
    }

    .eAttachmentRowMenu {
      visibility: hidden;
      margin-left: 0.2rem;
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
