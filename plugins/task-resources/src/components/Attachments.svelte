<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Attachment } from '@anticrm/chunter'
  import chunter from '@anticrm/chunter'
  import type { Class, Doc, Ref, Space } from '@anticrm/core'
  import { setPlatformStatus, unknownError } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { CircleButton, IconAdd, Label, Spinner } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import { uploadFile } from '../utils'
  import UploadDuo from './icons/UploadDuo.svelte'
  import task from '../plugin'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let attachments: Attachment[] = []

  const query = createQuery()
  $: query.query(chunter.class.Attachment, { attachedTo: objectId }, result => { attachments = result })

  let inputFile: HTMLInputElement
  let loading = 0

  const client = getClient()

  async function createAttachment (file: File) {
    loading++
    try {
      const uuid = await uploadFile(space, file, objectId)
      console.log('uploaded file uuid', uuid)
      client.addCollection(chunter.class.Attachment, space, objectId, _class, 'attachments', {
        name: file.name,
        file: uuid,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      })
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    } finally {
      loading--
    }
  }

  function fileSelected () {
    console.log(inputFile.files)
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

  let dragover = false
</script>

<div class="attachments-container">
  <div class="flex-row-center">
    <span class="title">Attachments</span>
    {#if loading}
      <Spinner/>
    {:else}
      <CircleButton icon={IconAdd} size={'small'} on:click={ () => { inputFile.click() } } />
    {/if}
    <input bind:this={inputFile} multiple type="file" name="file" id="file" style="display: none" on:change={fileSelected}/>
  </div>

  {#if attachments.length === 0 && !loading}
    <div class="flex-col-center mt-5 zone-container" class:solid={dragover} 
      on:dragover|preventDefault={ () => { dragover = true } } 
      on:dragleave={ () => { dragover = false } } 
      on:drop|preventDefault|stopPropagation={fileDrop}
    >
      <UploadDuo size={'large'} />
      <div class="small-text content-dark-color mt-2">
        <Label label={task.string.NoAttachmentsForTask} />
      </div>
      <div class="small-text">
        <a href={'#'} on:click={() => inputFile.click()}><Label label={task.string.UploadDropFilesHere} /></a>
      </div>
    </div>
  {:else}
    <Table 
      _class={chunter.class.Attachment}
      config={['', 'lastModified']}
      options={ {} }
      query={ { attachedTo: objectId } }
    />
  {/if}
</div>

<style lang="scss">
  .attachments-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: .75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
  }

  .zone-container {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: rgba(255, 255, 255, .03);
    border: 1px dashed rgba(255, 255, 255, .16);
    border-radius: .75rem;
  }
</style>