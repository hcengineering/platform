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
  import { createEventDispatcher } from 'svelte'
  import type { Ref, Space, Doc } from '@anticrm/core'

  import { getClient, Card } from '@anticrm/presentation'

  import recruit from '../plugin'
  import chunter from '@anticrm/chunter'
  import type { Candidate } from '@anticrm/recruit'
  import type { Attachment } from '@anticrm/chunter'

  import { EditBox, Link, showPopup, IconFile as FileIcon } from '@anticrm/ui'
  import FileUpload from './icons/FileUpload.svelte'
  import Avatar from './icons/Avatar.svelte'
  import PDFViewer from './PDFViewer.svelte'
  import Girl from '../../img/girl.png'
  import Elon from '../../img/elon.png'
  import Bond from '../../img/bond.png'

  export let space: Ref<Space>

  const object: Candidate = {
    lastName: '',
    firstName: '',
    city: ''
  } as Candidate
  const newValue = Object.assign({}, object)

  let resume = {} as {
    id: Ref<Attachment> | undefined
    name: string
    uuid: string
    size: number
    type: string
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createCandidate() {
    console.log(newValue)
    // create candidate      
    const candidateId = await client.createDoc(recruit.class.Candidate, space, {
      firstName: newValue.firstName,
      lastName: newValue.lastName,
      city: newValue.city,
      channels: newValue.channels,
    })

    console.log('resume name', resume.name)

    if (resume.id !== undefined) {
      // create attachment
      console.log('creaing attachment space', space)
      client.createDoc(chunter.class.Attachment, space, {
        attachmentTo: candidateId,
        collection: 'resume',
        name: resume.name,
        file: resume.uuid,
        type: resume.type,
        size: resume.size,
      }, resume.id)

      client.updateDoc(recruit.class.Candidate, space, candidateId, {
        resume: resume.id
      })
    }

    dispatch('close')
  }

  let inputFile: HTMLInputElement
  let kl: number = 0
</script>

<!-- <DialogHeader {space} {object} {newValue} {resume} create={true} on:save={createCandidate}/> -->

<Card label={'Create Candidate'} 
      okLabel={'Save'}
      okAction={createCandidate}
      bind:space={space}
      on:close={() => { dispatch('close') }}>

  <div class="flex">
    <div class="avatar" on:click={() => { (kl < 3) ? kl++ : kl = 0 }}>
      <div class="border"/>
      {#if kl === 0}
        <Avatar />
      {:else if kl === 1}
        <img src={Girl} alt="Avatar" />
      {:else if kl === 2}
        <img src={Elon} alt="Avatar" />
      {:else}
        <img src={Bond} alt="Avatar" />
      {/if}
    </div>

    <div class="flex-col">
      <div class="name"><EditBox placeholder="Name*" /></div>
      <div class="name"><EditBox placeholder="Surname*" /></div>
      <div class="city"><EditBox placeholder="Location" /></div>
      <div class="flex resume">
        {#if kl === 0}
          <a href={'#'} on:click={ () => { showPopup(PDFViewer, { file: resume.uuid }, 'right') } }>Upload resume</a>
        {:else}
          <a href={'#'} on:click={ () => { inputFile.click() } }>Resume</a>
          <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change/>
        {/if}
      </div>
    </div>
  </div>
</Card>

<style lang="scss">
  @import '../../../../packages/theme/styles/mixins.scss';

  .avatar {
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 1rem;
    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    filter: var(--theme-avatar-shadow);
    cursor: pointer;

    &::after {
      content: '';
      @include bg-layer(var(--theme-avatar-hover), .5);
      z-index: -1;
    }
    &::before {
      content: '';
      @include bg-layer(var(--theme-avatar-bg), .1);
      backdrop-filter: blur(25px);
      z-index: -2;
    }
    .border {
      @include bg-fullsize;
      border: 2px solid var(--theme-avatar-border);
      border-radius: 50%;
    }
  }

  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
  .city {
    margin: .75rem 0 .125rem;
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-color);
  }
  .resume a {
    font-size: .75rem;
    color: var(--theme-content-dark-color);
    &:hover { color: var(--theme-content-color); }
  }
</style>
