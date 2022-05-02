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
  import type { Attachment } from '@anticrm/attachment'
  import { getCurrentAccount } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { getClient, getFileUrl } from '@anticrm/presentation'
  import { ActionIcon, Icon, IconMoreH, Menu, showPopup } from '@anticrm/ui'
  import view, { Action } from '@anticrm/view'
  import { getActions } from '@anticrm/view-resources'
  import plugin from '../plugin'
  import FileDownload from './icons/FileDownload.svelte'

  export let attachment: Attachment
  export let isSaved = false
  const client = getClient()
  const myAccId = getCurrentAccount()._id

  $: saveAttachmentAction = isSaved
    ? ({
        label: plugin.string.RemoveAttachmentFromSaved,
        action: plugin.actionImpl.DeleteAttachmentFromSaved
      } as Action)
    : ({
        label: plugin.string.AddAttachmentToSaved,
        action: plugin.actionImpl.AddAttachmentToSaved
      } as Action)

  const showMenu = async (ev: Event) => {
    const actions = await getActions(client, attachment, attachment._class)
    const menuActions = [
      ...actions.map((a) => ({
        label: a.label,
        icon: a.icon,
        action: async (ctx: any, evt: MouseEvent) => {
          const impl = await getResource(a.action)
          await impl(attachment, evt)
        }
      })),
      {
        label: saveAttachmentAction.label,
        icon: saveAttachmentAction.icon,
        action: async (evt: MouseEvent) => {
          const impl = await getResource(saveAttachmentAction.action)
          await impl(attachment, evt)
        }
      }
    ]
    if (myAccId === attachment.modifiedBy) {
      menuActions.push({
        label: plugin.string.DeleteFile,
        icon: view.icon.Delete,
        action: async () => {
          await client.removeDoc(attachment._class, attachment.space, attachment._id)
        }
      })
    }
    showPopup(
      Menu,
      {
        actions: menuActions
      },
      ev.target as HTMLElement
    )
  }
</script>

<div class="actions">
  <a class="downloadButton" href={getFileUrl(attachment.file)} download={attachment.name} on:click|stopPropagation>
    <Icon icon={FileDownload} size={'small'} />
  </a>
  <ActionIcon icon={IconMoreH} size={'small'} action={showMenu} />
</div>

<style lang="scss">
  .actions {
    position: absolute;
    display: flex;
    padding: 0.5rem;
    border: 1px solid var(--theme-button-border-hovered);
    border-radius: 0.5rem;
    margin: 0.5rem;
    top: 0px;
    right: 0px;
    background-color: var(--board-bg-color);
  }

  .downloadButton {
    margin-right: 0.2rem;
  }
</style>
