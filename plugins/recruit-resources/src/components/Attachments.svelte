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
  import { CircleButton, IconAdd, showPopup, Spinner, Link } from '@anticrm/ui'

  import type { Doc, Ref, Space, Class, Bag } from '@anticrm/core'
  import { setPlatformStatus, unknownError } from '@anticrm/platform'
  import { generateId } from '@anticrm/core'
  import { createQuery, getClient, PDFViewer } from '@anticrm/presentation'
  import type { Attachment } from '@anticrm/chunter'
  import { Table } from '@anticrm/view-resources'

  import { uploadFile } from '../utils'
  import Upload from './icons/Upload.svelte'

  import chunter from '@anticrm/chunter'

  export let objectId: Ref<Doc>
  export let space: Ref<Space>
  export let _class: Ref<Class<Doc>>

  let attachments: Attachment[] = []

  const query = createQuery()
  $: query.query(chunter.class.Attachment, { attachedTo: objectId }, result => { attachments = result })

  let inputFile: HTMLInputElement
  let loading = false

  const client = getClient()

  async function createAttachment(file: File) {
    loading = true
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
      loading = false
    }
  }

  function fileSelected() {
    console.log(inputFile.files)
    const file = inputFile.files?.[0]
    if (file !== undefined) { createAttachment(file) }
  }

  let kl = true
  let dragover = false
  $: if (loading) kl = false
</script>

<div class="attachments-container">
  <div class="flex-row-center">
    <span class="title">Attachments</span>
    {#if loading}
      <Spinner/>
    {:else}
      <CircleButton icon={IconAdd} size={'small'} on:click={ () => { inputFile.click() } } />
    {/if}
    <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected}/>
  </div>

  {#if kl}
    <div class="flex-col-center mt-5 resume" class:solid={dragover} 
      on:dragover|preventDefault={ () => { dragover = true } } 
      on:dragleave={ () => { dragover = false } } 
      on:drop|preventDefault|stopPropagation
    >
      <Upload size={'large'} />
      <div class="small-text content-dark-color mt-2">There are no attachments for this candidate.</div>
      <div class="small-text">
        <Link label={'Upload'} href={'#'} on:click={ () => { inputFile.click() } } /> or drop files here
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

  .resume {
    padding: 1rem;
    color: var(--theme-caption-color);
    background: rgba(255, 255, 255, .03);
    border: 1px dashed rgba(255, 255, 255, .16);
    border-radius: .75rem;
  }
</style>