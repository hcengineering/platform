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
  import { getEmbeddedLabel, getResource } from '@hcengineering/platform'
  import {
    FilePreviewPopup,
    canPreviewFile,
    getBlobHref,
    getPreviewAlignment,
    previewTypes
  } from '@hcengineering/presentation'
  import {
    ActionIcon,
    IconMoreH,
    IconOpen,
    Menu,
    Action as UIAction,
    closeTooltip,
    showPopup,
    tooltip
  } from '@hcengineering/ui'
  import view, { Action } from '@hcengineering/view'

  import type { WithLookup } from '@hcengineering/core'
  import attachmentPlugin from '../plugin'
  import FileDownload from './icons/FileDownload.svelte'

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
        file: attachment.$lookup?.file ?? attachment.file,
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
    icon: IconOpen,
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
  {#await getBlobHref(attachment.$lookup?.file, attachment.file, attachment.name) then href}
    <a
      class="mr-1 flex-row-center gap-2 p-1"
      {href}
      download={attachment.name}
      bind:this={download}
      use:tooltip={{ label: getEmbeddedLabel(attachment.name) }}
      on:click|stopPropagation
    >
      {#if canPreview}
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
  {/await}
  <ActionIcon icon={IconMoreH} size={'medium'} action={showMenu} />
</div>
