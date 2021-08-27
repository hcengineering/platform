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

  import { EditBox, Button, Label } from '@anticrm/ui'
  import ImageButton from './ImageButton.svelte'
  import FileUpload from './icons/FileUpload.svelte'

  let dragover = false

  function drop(event: DragEvent) {
    dragover = false
    const droppedFile = event.dataTransfer?.files[0]
    const uploadUrl = getMetadata(login.metadata.UploadUrl)
    console.log(droppedFile)
    
    if (droppedFile !== undefined && uploadUrl !== undefined) {
      const data = new FormData()
      data.append('file', droppedFile)
      
      fetch(uploadUrl, {
        method: 'POST',
        body: data
      })
      .then(resonse => { console.log(resonse) })
      .catch(error => { console.log(error) })
    }
  }
</script>

<div class="header" class:dragover={dragover} 
    on:dragenter={ () => { console.log('dragenter'); dragover = true } }
    on:dragover|preventDefault={ ()=>{} }
    on:dragleave={ () => { dragover = false } }
    on:drop|preventDefault|stopPropagation={drop}>
  <div class="flex-col-center">
    <div class="avatar"></div>
    <div class="name"><EditBox placeholder="John"/>&nbsp;<EditBox placeholder="Appleseed"/></div>
    <div class="title">Candidate title</div>
    <!-- <input type="file" name="file" id="file"/> -->
  </div>
  <div class="resume-btn">
    <ImageButton label={'Upload resume'} icon={FileUpload} />
  </div>
  <div class="save-btn">
    <Button label={'Save'} size={'small'} onImage />
  </div>
</div>

<style lang="scss">

  .header {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40rem;
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

    .avatar {
      width: 5rem;
      height: 5rem;
      border-radius: 50%;
      background-color: #C4C4C4;
    }
    .name {
      margin-top: .625rem;
      font-size: 1rem;
      font-weight: 500;
      line-height: 150%;
      color: #fff;
    }
    .title {
      margin-top: .25rem;
      font-size: .75rem;
      font-weight: 500;
      color: rgba(255, 255, 255, .8);
    }

    .resume-btn {
      position: absolute;
      left: 1rem;
      bottom: 1rem;
    }
    .save-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
    }
  }

</style>
