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
  import type { Ref, Space, Doc, Class } from '@anticrm/core'
  import { CircleButton, EditBox, Link, showPopup, IconFile as FileIcon, IconAdd, Label } from '@anticrm/ui'
  import type { Attachment } from '@anticrm/chunter'
  import FileUpload from './icons/FileUpload.svelte'
  import { getClient, createQuery, Channels, AttributeEditor, PDFViewer } from '@anticrm/presentation'
  import { Panel } from '@anticrm/panel'
  import type { Candidate } from '@anticrm/recruit'
  import Contact from './icons/Contact.svelte'
  import Avatar from './icons/Avatar.svelte'
  import Attachments from './Attachments.svelte'
  import Edit from './icons/Edit.svelte'
  import SocialEditor from './SocialEditor.svelte'
  import AttributesBar from './AttributesBar.svelte'
  import { Table } from '@anticrm/view-resources'

  import core from '@anticrm/core'
  
  import recruit from '../plugin'
  import { combineName, formatName, getFirstName, getLastName } from '@anticrm/contact'

  export let _id: Ref<Candidate>
  let object: Candidate

  let firstName = ''
  let lastName = ''

  const client = getClient()

  const query = createQuery()
  $: query.query(recruit.class.Candidate, { _id }, result => { object = result[0]; firstName = getFirstName(result[0].name); lastName = getLastName(result[0].name)})

  const dispatch = createEventDispatcher()

  function saveChannels(result: any) {
    object.channels = result
    client.updateDoc(recruit.class.Candidate, object.space, object._id, { channels: result })
  }

  function firstNameChange() {
    client.updateDoc(recruit.class.Candidate, object.space, object._id, { name: combineName(firstName, getLastName(object.name)) })
  }

  function lastNameChange() {
    client.updateDoc(recruit.class.Candidate, object.space, object._id, { name: combineName(getFirstName(object.name), lastName) })
  }

</script>

{#if object !== undefined}
<Panel icon={Contact} title={formatName(object.name)} {object} on:close={() => { dispatch('close') }}>
  <AttributesBar {object} keys={['city', 'onsite', 'remote']} slot="subtitle" />

  <div class="flex-row-center">
    <div class="avatar">
      <div class="border"/>
      <Avatar />
    </div>
    <div class="flex-col">
      <div class="name"><EditBox placeholder="John" maxWidth="20rem" bind:value={firstName} on:change={ firstNameChange }/></div>
      <div class="name"><EditBox placeholder="Appleseed" maxWidth="20rem" bind:value={lastName} on:change={ lastNameChange }/></div>
      <div class="title"><AttributeEditor maxWidth="20rem" _class={recruit.class.Candidate} {object} key="title"/></div>
      <!-- <div class="city"><AttributeEditor maxWidth="20rem" _class={recruit.class.Candidate} {object} key="city"/></div> -->
      <div class="flex-row-center channels">
        {#if !object.channels || object.channels.length === 0}
          <CircleButton icon={IconAdd} size={'small'} selected on:click={(ev) => showPopup(SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => { saveChannels(result) })} />
          <span><Label label={'Add social links'} /></span>
        {:else}
          <Channels value={object.channels} size={'small'} />
          <CircleButton icon={Edit} size={'small'} selected on:click={(ev) => showPopup(SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => { saveChannels(result) })} />
        {/if}
      </div>
    </div>
  </div>

  <div class="group">
    <div class="caption">Applications</div>
    <Table 
      _class={recruit.class.Applicant}
      config={['', '$lookup.space.name', '$lookup.state']}
      options={
        {
          lookup: {
            state: core.class.State,
            space: core.class.Space
          }
        }
      }
      search=""
    />
  </div>

  <div class="group">
    <Attachments objectId={object._id} _class={object._class} space={object.space} {object}/>
  </div>

</Panel>
{/if}

<style lang="scss">
  @import '../../../../packages/theme/styles/mixins.scss';

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
  .title {
    margin-top: .25rem;
    font-size: .75rem;
  }
  .channels {
    margin-top: .75rem;
    span { margin-left: .5rem; }
  }

  .group {
    margin-top: 3.5rem;

    .caption {
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--theme-caption-color);
    }
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
