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
  import attachment from '@anticrm/attachment'
  import contact, { combineName, Person } from '@anticrm/contact'
  import type { Data, MixinData, Ref } from '@anticrm/core'
  import { generateId } from '@anticrm/core'
  import { setPlatformStatus, unknownError } from '@anticrm/platform'
  import { Avatar, Card, Channels, getClient, PDFViewer } from '@anticrm/presentation'
  import type { Candidate } from '@anticrm/recruit'
  import { CircleButton, EditBox, IconAdd, IconFile as FileIcon, Label, Link, showPopup, Spinner } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import recruit from '../plugin'
  import { uploadFile } from '../utils'
  import FileUpload from './icons/FileUpload.svelte'
  import YesNo from './YesNo.svelte'

  let firstName = ''
  let lastName = ''

  export function canClose (): boolean {
    return firstName === '' && lastName === '' && resume.uuid === undefined
  }

  const object: Candidate = {} as Candidate

  const resume = {} as {
    name: string
    uuid: string
    size: number
    type: string
    lastModified: number
  }

  const dispatch = createEventDispatcher()
  const client = getClient()
  const candidateId = generateId()

  async function createCandidate () {
    const candidate: Data<Person> = {
      name: combineName(firstName, lastName),
      city: object.city,
      channels: object.channels
    }
    const candidateData: MixinData<Person, Candidate> = {
      title: object.title,
      onsite: object.onsite,
      remote: object.remote
    }

    const id = await client.createDoc(contact.class.Person, contact.space.Contacts, candidate, candidateId)
    await client.createMixin(id as Ref<Person>, contact.class.Person, contact.space.Contacts, recruit.mixin.Candidate, candidateData)

    console.log('resume name', resume.name)

    if (resume.uuid !== undefined) {
      client.addCollection(attachment.class.Attachment, contact.space.Contacts, id, contact.class.Person, 'attachments', {
        name: resume.name,
        file: resume.uuid,
        size: resume.size,
        type: resume.type,
        lastModified: resume.lastModified
      })
    }

    dispatch('close')
  }

  let inputFile: HTMLInputElement
  let loading = false
  let dragover = false

  async function createAttachment (file: File) {
    loading = true
    try {
      resume.uuid = await uploadFile(space, file, candidateId)
      resume.name = file.name
      resume.size = file.size
      resume.type = file.type
      resume.lastModified = file.lastModified

      console.log('uploaded file uuid', resume.uuid)
    } catch (err: any) {
      setPlatformStatus(unknownError(err))
    } finally {
      loading = false
    }
  }

  function drop (event: DragEvent) {
    dragover = false
    const droppedFile = event.dataTransfer?.files[0]
    if (droppedFile !== undefined) { createAttachment(droppedFile) }
  }

  function fileSelected () {
    console.log(inputFile.files)
    const file = inputFile.files?.[0]
    if (file !== undefined) { createAttachment(file) }
  }
</script>

<!-- <DialogHeader {space} {object} {newValue} {resume} create={true} on:save={createCandidate}/> -->

<Card label={'Create Candidate'} 
      okAction={createCandidate}
      canSave={firstName.length > 0 && lastName.length > 0}
      space={contact.space.Contacts}
      on:close={() => { dispatch('close') }}>

  <!-- <StatusComponent slot="error" status={{ severity: Severity.ERROR, code: 'Can’t save the object because it already exists' }} /> -->
  <div class="flex-row-center">
    <div class="mr-4">
      <Avatar avatar={object.avatar} size={'large'} />
    </div>
    <div class="flex-col">
      <div class="fs-title"><EditBox placeholder="John" maxWidth="10rem" bind:value={firstName}/></div>
      <div class="fs-title mb-1"><EditBox placeholder="Appleseed" maxWidth="10rem" bind:value={lastName}/></div>
      <div class="small-text"><EditBox placeholder="Title" maxWidth="10rem" bind:value={object.title}/></div>
      <div class="small-text"><EditBox placeholder="Location" maxWidth="10rem" bind:value={object.city}/></div>
    </div>
  </div>

  <div class="flex-row-center channels">
    {#if !object.channels || object.channels.length === 0}
      <CircleButton icon={IconAdd} size={'small'} transparent on:click={(ev) => showPopup(contact.component.SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => { object.channels = result })} />
      <span><Label label={'Add social links'} /></span>
    {:else}
      <Channels value={object.channels} size={'small'} />
      <div class="ml-1">
        <CircleButton icon={contact.icon.Edit} size={'small'} transparent on:click={(ev) => showPopup(contact.component.SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => { object.channels = result })} />
      </div>
    {/if}
  </div>

  <div class="flex-center resume" class:solid={dragover || resume.uuid} 
      on:dragover|preventDefault={ () => { dragover = true } } 
      on:dragleave={ () => { dragover = false } } 
      on:drop|preventDefault|stopPropagation={drop}>
    {#if resume.uuid}
      <Link label={resume.name} href={'#'} icon={FileIcon} maxLenght={16} on:click={ () => { showPopup(PDFViewer, { file: resume.uuid, name: resume.name }, 'right') } }/>
    {:else}
      {#if loading}
        <Link label={'Uploading...'} href={'#'} icon={Spinner} disabled />
      {:else}
        <Link label={'Add or drop resume'} href={'#'} icon={FileUpload} on:click={ () => { inputFile.click() } } />
      {/if}
      <input bind:this={inputFile} type="file" name="file" id="file" style="display: none" on:change={fileSelected}/>
    {/if}
  </div>

  <div class="separator" />
  <div class="flex-col locations">
    <span><Label label={'Work location preferences'} /></span>
    <div class="row"><Label label={'Onsite'} /><YesNo bind:value={object.onsite} /></div>
    <div class="row"><Label label={'Remote'} /><YesNo bind:value={object.remote} /></div>
  </div>
</Card>

<style lang="scss">
  .channels {
    margin-top: 1.25rem;
    span { margin-left: .5rem; }
  }

  .locations {
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

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--theme-card-divider);
  }

  .resume {
    margin-top: 1rem;
    padding: .75rem;
    background: var(--theme-zone-bg);
    border: 1px dashed var(--theme-zone-border);
    border-radius: .5rem;
    backdrop-filter: blur(10px);
    &.solid { border-style: solid; }
  }
</style>
