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
  import { type Attachment } from '@hcengineering/attachment'
  import type { WithLookup } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import presentation, {
    FilePreviewPopup,
    canPreviewFile,
    getFileUrl,
    getPreviewAlignment,
    previewTypes
  } from '@hcengineering/presentation'
  import { IconMoreH, Menu, Action as UIAction, closeTooltip, showPopup, tooltip } from '@hcengineering/ui'
  import view, { Action } from '@hcengineering/view'

  import AttachmentAction from './AttachmentAction.svelte'
  import FileDownload from './icons/FileDownload.svelte'
  import attachmentPlugin from '../plugin'

  export let attachment: WithLookup<Attachment>
  export let isSaved = false
  export let removable = false

  let download: HTMLAnchorElement

  $: contentType = attachment?.type ?? ''

  let canPreview: boolean = false
  $: if (attachment !== undefined) {
    void canPreviewFile(contentType, $previewTypes).then((res) => {
      canPreview = res
    })
  } else {
    canPreview = false
  }

  function showPreview (e: MouseEvent): void {
    if (!canPreview) {
      return
    }

    e.preventDefault()
    e.stopPropagation()
    if (e.metaKey || e.ctrlKey) {
      window.open((e.target as HTMLAnchorElement).href, '_blank')
      return
    }
    closeTooltip()

    showPopup(
      FilePreviewPopup,
      {
        file: attachment.file,
        contentType: attachment.type,
        name: attachment.name,
        metadata: attachment.metadata
      },
      getPreviewAlignment(attachment.type ?? '')
    )
  }

  $: saveAttachmentAction = isSaved
    ? ({
        label: attachmentPlugin.string.RemoveAttachmentFromSaved,
        action: attachmentPlugin.actionImpl.DeleteAttachmentFromSaved
      } as unknown as Action)
    : ({
        label: attachmentPlugin.string.AddAttachmentToSaved,
        action: attachmentPlugin.actionImpl.AddAttachmentToSaved
      } as unknown as Action)

  const openAction: UIAction = {
    label: view.string.Open,
    icon: view.icon.Open,
    action: async (props: any, evt: Event) => {
      showPreview(evt as MouseEvent)
    }
  }

  const showMenu = (ev: Event) => {
    const actions: UIAction[] = []
    if (canPreview) {
      actions.push(openAction)
    }
    actions.push({
      label: saveAttachmentAction.label,
      icon: saveAttachmentAction.icon,
      action: async (props: any, evt: Event) => {
        const impl = await getResource(saveAttachmentAction.action)
        await impl(attachment, evt)
      }
    })
    if (removable) {
      actions.push({
        label: attachmentPlugin.string.DeleteFile,
        action: async (props: any, evt: Event) => {
          const impl = await getResource(attachmentPlugin.actionImpl.DeleteAttachment)
          await impl(attachment, evt)
        }
      })
    }
    showPopup(
      Menu,
      {
        actions
      },
      ev.target as HTMLElement
    )
  }
</script>

<div class="flex">
  {#if canPreview}
    <AttachmentAction
      label={view.string.Open}
      icon={view.icon.Open}
      size="small"
      dataId="open-in-sidebar"
      action={showPreview}
    />
  {/if}
  <a
    href={getFileUrl(attachment.file, attachment.name)}
    download={attachment.name}
    bind:this={download}
    use:tooltip={{ label: presentation.string.Download }}
    on:click|stopPropagation
  >
    <AttachmentAction
      label={presentation.string.Download}
      icon={FileDownload}
      size="small"
      dataId="open-in-sidebar"
      action={() => {
        download.click()
      }}
    />
  </a>
  <AttachmentAction
    label={view.string.MoreActions}
    icon={IconMoreH}
    size="small"
    dataId="open-in-sidebar"
    action={showMenu}
  />
</div>
