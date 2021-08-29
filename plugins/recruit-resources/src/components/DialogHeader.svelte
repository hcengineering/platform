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
  import { getMetadata } from '@anticrm/platform'
  import login from '@anticrm/login'
  import { createQuery } from '@anticrm/presentation'

  import { EditBox, Button, CircleButton, Grid, Label } from '@anticrm/ui'
  import FileUpload from './icons/FileUpload.svelte'
  import Edit from './icons/Edit.svelte'
  import Twitter from './icons/Twitter.svelte'
  import User from './icons/User.svelte'

  import chunter from '@anticrm/chunter'

  const query = createQuery()

  $: query.query(chunter.class.Attachment, {}, result => { console.log('attachments',  result) })  

  let dragover = false
  let loading = false

  function upload(file: File) {
    console.log(file)
    const uploadUrl = getMetadata(login.metadata.UploadUrl)
    
    const data = new FormData()
    data.append('file', file)

    loading = true
    const url = `${uploadUrl}?collection=resume&name=${file.name}`
    fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + getMetadata(login.metadata.LoginToken)
      },
      body: data
    })
    .then(resonse => { console.log(resonse) })
    .catch(error => { console.log(error) })
    .finally(() => { loading = false })
  }

  function drop(event: DragEvent) {
    dragover = false
    const droppedFile = event.dataTransfer?.files[0]
    if (droppedFile !== undefined) { upload(droppedFile) }
  }

  let inputFile: HTMLInputElement

  function fileSelected() {
    console.log(inputFile.files)
    const file = inputFile.files?.[0]
    if (file !== undefined) { upload(file) }
  }
</script>

<div class="header" class:dragover={dragover} 
    on:dragenter={ () => { dragover = true } }
    on:dragover|preventDefault={ ()=>{} }
    on:dragleave={ () => { dragover = false } }
    on:drop|preventDefault|stopPropagation={drop}>
  <div class="flex-row-center main-content">
    <div class="avatar"><User /></div>
    <div class="flex-col">
      <div class="name">
        <EditBox placeholder="John" />
        <EditBox placeholder="Appleseed" />
      </div>
      <!-- <div class="name"><EditBox placeholder="John"/>&nbsp;<EditBox placeholder="Appleseed"/></div> -->
      <div class="title"><EditBox placeholder="Los Angeles"/></div>
    </div>
  </div>
  <div class="lb-content">
    <Button label={'Upload resume'} {loading} icon={FileUpload} size={'small'} transparent primary on:click={() => { inputFile.click() }}/>
    <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected}/>
  </div>
  <div class="rb-content">
    <Button label={'Save'} size={'small'} transparent />
  </div>
  <div class="rt-content">
    <Grid column={2} columnGap={.5}>
      <CircleButton icon={Twitter} label={'Twitter'} />
      <CircleButton icon={Edit} label={'Edit'} />
    </Grid>
  </div>
</div>

<style lang="scss">
  .header {
    position: relative;
    // display: flex;
    // justify-content: center;
    // align-items: center;
    padding: 1.5rem 1.5rem 0;
    width: 37.5rem;
    min-height: 15rem;
    height: 15rem;
    background-image: url(../../img/header-green.png);
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

    .lb-content {
      position: absolute;
      left: 1.5rem;
      bottom: 1.5rem;
    }
    .rb-content {
      position: absolute;
      right: 1.5rem;
      bottom: 1.5rem;
    }
    .rt-content {
      position: absolute;
      top: 1.5rem;
      right: 1.5rem;
    }
  }
</style>
