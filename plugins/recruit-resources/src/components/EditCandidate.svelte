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
  import { Tabs, EditBox, Link, showPopup, IconFile as FileIcon } from '@anticrm/ui'
  import FileUpload from './icons/FileUpload.svelte'
  import PDFViewer from './PDFViewer.svelte'
  import { getClient, Channels } from '@anticrm/presentation'
  import { Panel } from '@anticrm/panel'
  import type { Candidate } from '@anticrm/recruit'
  import DialogHeader from './DialogHeader.svelte'
  import Contact from './icons/Contact.svelte'
  import Avatar from './icons/Avatar.svelte'
  import Attachments from './Attachments.svelte'

  import chunter from '@anticrm/chunter'
  
  import recruit from '../plugin'

  export let object: Candidate
  export let space: Ref<Space>

  const newValue = Object.assign({}, object)

  let resume = {} as {
    id: Ref<Doc> | undefined
    name: string
    uuid: string
    size: number
    type: string
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function save() {

    if (resume.id !== undefined) {
      // create attachment
      console.log('creaing attachment space', space)
      client.createDoc(chunter.class.Attachment, space, {
        attachmentTo: object._id,
        collection: 'resume',
        name: resume.name,
        file: resume.uuid,
        type: resume.type,
        size: resume.size,
      }, resume.id)
    }

    const attributes: Record<string, any> = {}
    for (const key in newValue) {
      if ((newValue as any)[key] !== (object as any)[key]) {
        attributes[key] = (newValue as any)[key]
      }
    }
    console.log('update attributes', attributes)
    await client.updateDoc(recruit.class.Candidate, object.space, object._id, attributes)

    dispatch('close')
  }

  const tabModel = [
    // {
    //   label: 'General',
    //   component: 'recruit:component:CandidateGeneral',
    //   props: {
    //     object,
    //     newValue,
    //   }
    // },
    {
      label: 'Activity',
      component: 'chunter:component:Activity',
      props: {
        object,
        space
      }
    },
    {
      label: 'Attachments',
      component: 'recruit:component:Attachments',
      props: {
        object,
        space
      }
    }
  ]

  let inputFile: HTMLInputElement

</script>

<!-- <div class="container">
  <DialogHeader {space} {object} {newValue} {resume} on:save={ save }/>
  <div class="tabs-container">
    <Tabs model={tabModel}/>
  </div>
</div> -->

<Panel icon={Contact} label={object.firstName + ' ' + object.lastName} on:save={ save } on:close={() => { dispatch('close') }}>
  <svelte:fragment slot="subtitle">
    <div class="flex-row-reverse" style="width: 100%">
      <Channels value={object.channels} reverse />
    </div>
  </svelte:fragment>

  <div class="flex-row-center user-container">
    <div class="avatar">
      <div class="border"/>
      <Avatar />
    </div>
    <div class="flex-col">
      <div class="name"><EditBox placeholder="Name" maxWidth="15rem" bind:value={object.firstName}/></div>
      <div class="name"><EditBox placeholder="Surname" maxWidth="15rem" bind:value={object.lastName}/></div>
      <div class="city"><EditBox placeholder="Location" maxWidth="15rem" bind:value={object.city}/></div>
      <div class="flex resume">
        {#if resume.id}
          <Link label={resume.name} href={'#'} icon={FileIcon} on:click={ () => { showPopup(PDFViewer, { file: resume.uuid }, 'right') } }/>
        {:else}
          <a href={'#'} on:click={ () => { inputFile.click() } }>Upload resume</a>
          <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" />
        {/if}
      </div>
    </div>
  </div>

  <div class="attachments">
    <Attachments />
  </div>

</Panel>

<style lang="scss">
  @import '../../../../packages/theme/styles/mixins.scss';

  .user-container {
    margin-top: 2.5rem;
  }
  .avatar {
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-right: 1.5rem;
    width: 6rem;
    height: 6rem;
    border-radius: 50%;
    filter: drop-shadow(0px 14px 44px rgba(28, 23, 22, .8));
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

  .attachments {
    margin-top: 3.5rem;
  }

  // .container {
  //   display: flex;
  //   flex-direction: column;
  //   height: 100%;
  //   background-color: var(--theme-bg-color);
  //   border-radius: 1.25rem;
  //   box-shadow: 0px 3.125rem 7.5rem rgba(0, 0, 0, .4);

  //   .tabs-container {
  //     flex-grow: 1;
  //     display: flex;
  //     flex-direction: column;
  //     height: fit-content;
  //     padding: 0 2.5rem 2.5rem;
  //   }
  // }
</style>
