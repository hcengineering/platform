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
  import type { Attachment } from '@hcengineering/attachment'
  import { getResource } from '@hcengineering/platform'
  import { showPopup, ActionIcon, IconMoreH, Menu } from '@hcengineering/ui'
  import { Action } from '@hcengineering/view'
  import { getFileUrl } from '@hcengineering/presentation'

  import attachmentPlugin from '../plugin'
  import FileDownload from './icons/FileDownload.svelte'

  export let attachment: Attachment
  export let isSaved = false

  let download: HTMLAnchorElement

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
          },
          {
            label: attachmentPlugin.string.DeleteFile,
            action: async (evt: MouseEvent) => {
              const impl = await getResource(attachmentPlugin.actionImpl.DeleteAttachment)
              await impl(attachment, evt)
            }
          }
        ]
      },
      ev.target as HTMLElement
    )
  }
</script>

<div class="flex">
  <a
    class="mr-1"
    href={getFileUrl(attachment.file, 'full', attachment.name)}
    download={attachment.name}
    bind:this={download}
    on:click|stopPropagation
  >
    <ActionIcon icon={FileDownload} size={'small'} action={() => download.click()} />
  </a>
  <ActionIcon icon={IconMoreH} size={'small'} action={showMenu} />
</div>
