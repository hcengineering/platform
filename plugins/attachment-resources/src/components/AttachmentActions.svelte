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
  import { AttachmentPreviewExtension, type Attachment } from '@hcengineering/attachment'
  import { getResource } from '@hcengineering/platform'
  import { getFileUrl } from '@hcengineering/presentation'
  import {
    Action as UIAction,
    ActionIcon,
    IconMoreH,
    IconOpen,
    Menu,
    closeTooltip,
    showPopup,
    PopupAlignment
  } from '@hcengineering/ui'
  import view, { Action } from '@hcengineering/view'

  import { previewTypes, getPreviewType, isOpenable } from '../utils'
  import attachmentPlugin from '../plugin'
  import FileDownload from './icons/FileDownload.svelte'

  export let attachment: Attachment
  export let isSaved = false
  export let removable = false

  let download: HTMLAnchorElement

  $: contentType = attachment?.type ?? ''
  let openable = false
  $: {
    void isOpenable(contentType, $previewTypes).then((res) => {
      openable = res
    })
  }

  let previewType: AttachmentPreviewExtension | undefined = undefined
  $: if (openable) {
    void getPreviewType(contentType, $previewTypes).then((res) => {
      previewType = res
    })
  } else {
    previewType = undefined
  }

  function showPreview (e: MouseEvent): void {
    if (!openable || previewType === undefined) {
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
      previewType.component,
      { ...(previewType.props ?? {}), file: attachment.file, name: attachment.name, contentType, value: attachment },
      (previewType.alignment ?? 'center') as PopupAlignment
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
    icon: IconOpen,
    action: async (props: any, evt: Event) => {
      showPreview(evt as MouseEvent)
    }
  }

  const showMenu = (ev: Event) => {
    const actions: UIAction[] = []
    if (openable) {
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
  <a
    class="mr-1 flex-row-center gap-2 p-1"
    href={getFileUrl(attachment.file, 'full', attachment.name)}
    download={attachment.name}
    bind:this={download}
    on:click|stopPropagation
  >
    {#if openable}
      <ActionIcon
        icon={IconOpen}
        size={'medium'}
        action={(evt) => {
          showPreview(evt)
        }}
      />
    {/if}
    <ActionIcon
      icon={FileDownload}
      size={'medium'}
      action={() => {
        download.click()
      }}
    />
  </a>
  <ActionIcon icon={IconMoreH} size={'medium'} action={showMenu} />
</div>
