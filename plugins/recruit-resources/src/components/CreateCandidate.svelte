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
  import type { Ref, Space, Data } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { setPlatformStatus, unknownError } from '@anticrm/platform'

  import { getClient, Card, Channels, PDFViewer } from '@anticrm/presentation'
  import { uploadFile } from '../utils'

  import recruit from '../plugin'
  import chunter from '@anticrm/chunter'
  import type { Candidate } from '@anticrm/recruit'
  import type { Attachment } from '@anticrm/chunter'

  import { EditBox, Link, showPopup, Component, CircleButton, IconFile as FileIcon, Spinner, Label } from '@anticrm/ui'
  import FileUpload from './icons/FileUpload.svelte'
  import Avatar from './icons/Avatar.svelte'
  import Edit from './icons/Edit.svelte'
  import SocialEditor from './SocialEditor.svelte'
  import YesNo from './YesNo.svelte'

  import Girl from '../../img/girl.png'
  import Elon from '../../img/elon.png'
  import Bond from '../../img/bond.png'

  import { combineName } from '@anticrm/contact';

  export let space: Ref<Space>

  let _space = space

  let firstName = ''
  let lastName = ''

  export function canClose(): boolean {
    return firstName === '' && lastName === ''
  }

  const object: Candidate = {} as Candidate

  let resume = {} as {
    name: string
    uuid: string
    size: number
    type: string
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const candidateId = generateId()

  async function createCandidate() {
    const candidate: Data<Candidate> = {
      name: combineName(firstName, lastName),
      title: object.title,
      city: object.city,
      channels: object.channels,
      attachments: {},
      onsite: object.onsite,
      remote: object.remote
    }

    if (resume.uuid !== undefined) {
      candidate.attachments[encodeURIComponent(resume.uuid)] = {
          _class: chunter.class.Attachment,
          name: resume.name,
          file: resume.uuid,
          size: resume.size,
          type: resume.type
      }
    }

    await client.createDoc(recruit.class.Candidate, _space, candidate, candidateId)
    console.log('resume name', resume.name)

    // if (resume.id !== undefined) {
    //   // create attachment
    //   console.log('creaing attachment space', _space)
    //   client.createDoc(chunter.class.Attachment, _space, {
    //     attachedTo: candidateId,
    //     collection: 'resume',
    //     name: resume.name,
    //     file: resume.uuid,
    //     type: resume.type,
    //     size: resume.size,
    //   }, resume.id)

    //   client.updateDoc(recruit.class.Candidate, _space, candidateId, {
    //     resume: resume.id
    //   })
    // }

    dispatch('close')
  }

  let inputFile: HTMLInputElement
  let loading = false

  async function createAttachment(file: File) {
    loading = true
    try {
      resume.uuid = await uploadFile(space, file, candidateId)
      resume.name = file.name
      resume.size = file.size
      resume.type = file.type

      console.log('uploaded file uuid', resume.uuid)
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

  let kl: number = 0
</script>

<!-- <DialogHeader {space} {object} {newValue} {resume} create={true} on:save={createCandidate}/> -->

<Card label={'Create Candidate'} 
      okLabel={'Save'}
      okAction={createCandidate}
      canSave={firstName.length > 0 && lastName.length > 0}
      spaceClass={recruit.class.Candidates}
      spaceLabel={'Talent Pool'}
      spacePlaceholder={'Select pool'}
      bind:space={_space}
      on:close={() => { dispatch('close') }}>

  <div class="flex-row-center">
    <div class="avatar-container">
      <div class="flex-center avatar-shadow">
        {#if kl === 0}
          <div class="bg-avatar"><Avatar /></div>
        {:else if kl === 1}
          <div class="bg-avatar"><img src={Girl} alt="Avatar" /></div>
        {:else if kl === 2}
          <div class="bg-avatar"><img src={Elon} alt="Avatar" /></div>
        {:else}
          <div class="bg-avatar"><img src={Bond} alt="Avatar" /></div>
        {/if}
      </div>
      <div class="flex-center avatar" on:click={() => { (kl < 3) ? kl++ : kl = 0 }}>
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
    </div>

    <div class="flex-col">
      <div class="name"><EditBox placeholder="John" maxWidth="9.5rem" bind:value={firstName}/></div>
      <div class="name"><EditBox placeholder="Appleseed" maxWidth="9.5rem" bind:value={lastName}/></div>
      <div class="title"><EditBox placeholder="Title" maxWidth="9.5rem" bind:value={object.title}/></div>
      <div class="city"><EditBox placeholder="Location" maxWidth="9.5rem" bind:value={object.city}/></div>
      <!-- <div class="flex resume">
        {#if resume.uuid}
          <Link label={resume.name} href={'#'} icon={FileIcon} maxLenght={16} on:click={ () => { showPopup(PDFViewer, { file: resume.uuid }, 'right') } }/>
        {:else}
          {#if loading}
            <Link label={'Uploading...'} href={'#'} icon={Spinner} disabled />
          {:else}
            <Link label={'Upload resume'} href={'#'} icon={FileUpload} on:click={ () => { inputFile.click() } } />
          {/if}
          <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected}/>
        {/if}
      </div> -->
    </div>
  </div>
  <div class="flex-col locations">
    <span><Label label={'Work location preferences'} /></span>
    <div class="row"><Label label={'Onsite'} /><YesNo bind:value={object.onsite} /></div>
    <div class="row"><Label label={'Remote'} /><YesNo bind:value={object.remote} /></div>
  </div>
  <svelte:fragment slot="contacts">
    <Channels value={object.channels} />
    <CircleButton icon={Edit} label={'Edit'} on:click={(ev) => showPopup(SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => { object.channels = result })} />
  </svelte:fragment>
</Card>

<style lang="scss">
  @import '../../../../packages/theme/styles/mixins.scss';

  .avatar-container {
    flex-shrink: 0;
    position: relative;
    margin-right: 1rem;
    width: 6rem;
    height: 6rem;
    user-select: none;
  }
  .avatar-shadow {
    position: absolute;
    width: 6rem;
    height: 6rem;

    .bg-avatar {
      transform: scale(1.1);
      filter: blur(10px);
      opacity: .75;
    }
  }
  .avatar {
    overflow: hidden;
    position: absolute;
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
  .title, .city {
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-accent-color);
  }
  .title { margin-top: .5rem; }
  .locations {
    margin-top: 1.5rem;
    
    span {
      margin-bottom: .125rem;
      font-weight: 500;
      font-size: .75rem;
      color: var(--theme-content-accent-color);
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: .75rem;
      color: var(--theme-caption-color);
    }
  }
  // .resume a {
  //   font-size: .75rem;
  //   color: var(--theme-content-dark-color);
  //   &:hover { color: var(--theme-content-color); }
  // }
</style>
