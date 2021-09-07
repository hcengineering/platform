<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  
  import type { Ref, Space, Doc } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { EditBox, Button, CircleButton, Grid, Label, Link, showPopup, Component, IconFile as FileIcon } from '@anticrm/ui'
  import type { AnyComponent } from '@anticrm/ui'
  import { getClient } from '@anticrm/presentation'

  import AvatarEditor from './AvatarEditor.svelte'
  import FileUpload from './icons/FileUpload.svelte'
  import Edit from './icons/Edit.svelte'
  import Twitter from './icons/Twitter.svelte'
  import User from './icons/User.svelte'
  import SocialEditor from './SocialEditor.svelte'

  import { uploadFile } from '../utils'
  import { Candidate } from '@anticrm/recruit'

  import chunter from '@anticrm/chunter'
  import contact from '@anticrm/contact'

  const dispatch = createEventDispatcher()

  export let space: Ref<Space>
  export let object: Candidate
  export let newValue: Candidate
  export let create = false

  export let resume: {
    id: Ref<Doc> | undefined
    name: string
    uuid: string
    size: number
    type: string
  }

  const client = getClient()

  if (newValue.resume !== undefined) {
    client.findOne(chunter.class.Attachment, { _id: newValue.resume }).then(result => { 
      if (result !== undefined) {
        resume = {
          id: result._id,
          name: result.name,
          uuid: result.file,
          size: result.size,
          type: result.type,
        }
      }
    })
  }

  let dragover = false
  let loading = false
  let changed = false

  function isChanged(): void {
    for (const key in object) {
      if ((newValue as any)[key] !== (object as any)[key]) {
        changed = true
        return
      }
    }
    changed = false
  }

  async function createAttachment(file: File) {
    loading = true
    try {
      const id = generateId()
      resume.uuid = await uploadFile(id, space, file)
      resume.id = id
      resume.name = file.name
      resume.size = file.size
      resume.type = file.type

      console.log('uploaded file uuid', resume.uuid)

    } finally {
      loading = false
    }
  }

  function drop(event: DragEvent) {
    dragover = false
    const droppedFile = event.dataTransfer?.files[0]
    if (droppedFile !== undefined) { createAttachment(droppedFile) }
  }

  let inputFile: HTMLInputElement

  function fileSelected() {
    console.log(inputFile.files)
    const file = inputFile.files?.[0]
    if (file !== undefined) { createAttachment(file) }
  }
</script>

<form on:submit|preventDefault={()=>{}}>
<div class="header" class:dragover={dragover} 
    on:dragenter={ () => { dragover = true } }
    on:dragover|preventDefault={ ()=>{} }
    on:dragleave={ () => { dragover = false } }
    on:drop|preventDefault|stopPropagation={drop}>
  <div class="flex-row-center main-content">
    <div class="avatar" on:click|stopPropagation={() => showPopup(AvatarEditor, { label: 'Profile photo' })}><User /></div>
    <div class="flex-col">
      <div class="name">
        <EditBox placeholder="John" bind:value={newValue.firstName} on:input={isChanged} focus={create}/>
        <EditBox placeholder="Appleseed" bind:value={newValue.lastName} on:input={isChanged}/>
      </div>
      <div class="title"><EditBox placeholder="Location" bind:value={newValue.city} on:input={isChanged}/></div>
    </div>
  </div>
  <div class="abs-lb-content">
    {#if resume.id}
      <Link label={resume.name} href={'#'} icon={FileIcon} />
    {:else}
      <Button label={'Upload resume'} {loading} icon={FileUpload} size={'small'} transparent primary on:click={() => { inputFile.click() }}/>
      <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected}/>
    {/if}
  </div>
  <div class="abs-rb-content">
    {#if changed}
      <Button label={ create ? 'Create' : 'Save' } size={'small'} transparent on:click={ () => { dispatch('save') } }/>
    {/if}
  </div>
  <div class="abs-rt-content flex-row-center">
    <div style="margin-right: .25rem"><Component is='contact:component:ChannelsPresenter' props={ { value: newValue.channels } }/></div>
    <CircleButton icon={Edit} label={'Edit'} on:click={(ev) => showPopup(SocialEditor, { values: newValue.channels ?? [] }, ev.target, (result) => { newValue.channels = result; isChanged() })} />
  </div>
</div>
</form>

<style lang="scss">
  .header {
    position: relative;
    padding: 1.5rem 1.5rem 0;
    width: 45rem;
    min-height: 12.5rem;
    height: 12.5rem;
    background-image: url(../../img/bg-pink-mixed.jpg);
    background-repeat: no-repeat;
    background-clip: border-box;
    background-size: cover;
    border-radius: 1.25rem;

    &.dragover {
      border: 1px solid red;
    }

    .main-content {
      .avatar {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 1.25rem;
        width: 6rem;
        height: 6rem;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, .2);
        backdrop-filter: blur(3px);
        box-shadow: 0 1.5rem 3rem rgba(0, 0, 0, .3);
        cursor: pointer;
      }
      .name {
        display: flex;
        flex-direction: column;
        font-size: 1.25rem;
        font-weight: 500;
        color: #fff;
        input {
          margin: 0;
          padding: 0;
          border: none;
          &::placeholder { color: var(--theme-content-dark-color); }
        }
      }
      .title {
        margin-top: .5rem;
        font-size: .75rem;
        font-weight: 500;
        color: rgba(255, 255, 255, .6);
      }
    }
  }
</style>
