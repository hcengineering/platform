<!--
// Copyright © 2022 Anticrm Platform Contributors.
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
  import { getResource } from '@anticrm/platform'
  import { showPopup, ActionIcon, IconMoreH, Menu, Icon } from '@anticrm/ui'
  import { Action } from '@anticrm/view'
  import { getFileUrl } from '@anticrm/presentation'

  import attachmentPlugin from '../plugin'
  import FileDownload from './icons/FileDownload.svelte'

  export let attachment: Attachment
  export let isSaved = false

  $: saveAttachmentAction = isSaved
    ? ({
        label: attachmentPlugin.string.RemoveAttachmentFromSaved,
        action: attachmentPlugin.actionImpl.DeleteAttachmentFromSaved
      } as Action)
    : ({
        label: attachmentPlugin.string.AddAttachmentToSaved,
        action: attachmentPlugin.actionImpl.AddAttachmentToSaved
      } as Action)

  const showMenu = (ev: Event) => {
    showPopup(
      Menu,
      {
        actions: [
          {
            label: saveAttachmentAction.label,
            icon: saveAttachmentAction.icon,
            action: async (evt: MouseEvent) => {
              const impl = await getResource(saveAttachmentAction.action)
              await impl(attachment, evt)
            }
          }
        ]
      },
      ev.target as HTMLElement
    )
  }
</script>

<div class="actions">
  <a href={getFileUrl(attachment.file)} download={attachment.name} on:click|stopPropagation>
    <Icon icon={FileDownload} size={'small'} />
  </a>
  <ActionIcon icon={IconMoreH} size={'small'} action={showMenu} />
</div>

<style lang="scss">
  .actions {
    display: flex;
  }
</style>
