
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
  import { createQuery, getClient } from '@anticrm/presentation'
  import { ReferenceInput } from '@anticrm/text-editor'
  import { deleteFile, uploadFile } from '../utils'
  import attachment from '../plugin'
  import { setPlatformStatus, unknownError } from '@anticrm/platform'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import { Class, Doc, Ref, Space } from '@anticrm/core'
  import { Attachment } from '@anticrm/attachment'
  import AttachmentPresenter from './AttachmentPresenter.svelte'
  import { IconClose } from '@anticrm/ui'
import ActionIcon from '@anticrm/ui/src/components/ActionIcon.svelte';

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let inputFile: HTMLInputElement
  let saved = false
  const dispatch = createEventDispatcher()

  const client = getClient()
  const query = createQuery()
  let attachments: Attachment[] = []

  $: objectId && query.query(attachment.class.Attachment, {
    attachedTo: objectId
  }, (res) => attachments = res)

  async function createAttachment (file: File) {
    try {
      const uuid = await uploadFile(file, { space, attachedTo: objectId })
      console.log('uploaded file uuid', uuid)
      await client.addCollection(attachment.class.Attachment, space, objectId, _class, 'attachments', {
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    }
  }

  function fileSelected () {
    const list = inputFile.files
    if (list === null || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(file)
    }
  }

  function fileDrop (e: DragEvent) {
    const list = e.dataTransfer?.files
    if (list === undefined || list.length === 0) return
    for (let index = 0; index < list.length; index++) {
      const file = list.item(index)
      if (file !== null) createAttachment(file)
    }
  }

  async function removeAttachment (attachment: Attachment): Promise<void> {
    await client.removeCollection(attachment._class, attachment.space, attachment._id, attachment.attachedTo, attachment.attachedToClass, 'attachments')
    await deleteFile(attachment.file)
  }

  onDestroy(() => {
    if (!saved) {
      attachments.map((attachment) => {
        removeAttachment(attachment)
      })
    }
  })

  async function onMessage (event: CustomEvent) {
    saved = true
    dispatch('message', { message: event.detail, attachments: attachments.length })
  }

</script>

<input
  bind:this={inputFile}
  multiple
  type="file"
  name="file"
  id="file"
  style="display: none"
  on:change={fileSelected}
  />
<div class="container"
  on:dragover|preventDefault={() => {}}
  on:dragleave={() => {}}
  on:drop|preventDefault|stopPropagation={fileDrop}
  >
  {#if attachments.length}
    <div class='flex-row-center list'>
      {#each attachments as attachment}
        <div class='item flex'>
          <AttachmentPresenter value={attachment} />
          <div class='remove'>
            <ActionIcon icon={IconClose} action={() => { removeAttachment(attachment) }} size='small' />
          </div>
        </div>
      {/each}
    </div>
  {/if}
  <ReferenceInput on:message={onMessage} withoutTopBorder={attachments.length > 0} on:attach={() => { inputFile.click() }} />
</div>

<style lang="scss">
  .list {
    padding: 1rem;
    color: var(--theme-caption-color);
    overflow-x: auto;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-bg-accent-color);
    border-radius: .75rem;
    border-bottom-left-radius: 0;
    border-bottom-right-radius: 0;

    .item + .item {
      padding-left: 1rem;
      border-left: 1px solid var(--theme-bg-accent-color);
    }

    .item {
      .remove {
        visibility: hidden;
      }
    }

    .item:hover {
      .remove {
        visibility: visible;
      }
    }
  }
</style>
