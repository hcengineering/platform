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
  import { CircleButton, EditBox, Link, showPopup, IconFile as FileIcon } from '@anticrm/ui'
  import type { Attachment } from '@anticrm/chunter'
  import FileUpload from './icons/FileUpload.svelte'
  import { getClient, createQuery, Channels, AttributeEditor, PDFViewer } from '@anticrm/presentation'
  import { Panel } from '@anticrm/panel'
  import type { Candidate, Applicant } from '@anticrm/recruit'
  import Contact from './icons/Contact.svelte'
  import Avatar from './icons/Avatar.svelte'
  import Attachments from './Attachments.svelte'
  import Edit from './icons/Edit.svelte'
  import SocialEditor from './SocialEditor.svelte'
  import CandidateCard from './CandidateCard.svelte'
  import VacancyCard from './VacancyCard.svelte'

  import chunter from '@anticrm/chunter'
  
  import recruit from '../plugin'
  import { formatName } from '@anticrm/contact'

  export let _id: Ref<Applicant>
  let object: Applicant
  let candidate: Candidate

  const client = getClient()

  const query = createQuery()
  $: query.query(recruit.class.Applicant, { _id }, result => { object = result[0] })

  const candidateQuery = createQuery()
  $: if (object !== undefined) candidateQuery.query(recruit.class.Candidate, { _id: object.candidate }, result => { candidate = result[0] })

  const dispatch = createEventDispatcher()

  // function saveChannels(result: any) {
  //   object.channels = result
  //   client.updateDoc(recruit.class.Candidate, object.space, object._id, { channels: result })
  // }

  function getVacancyName() {
    return client.getModel().getObject(object.space).name
  }

</script>

{#if object !== undefined && candidate !== undefined}
<Panel icon={Contact} title={formatName(candidate.name)} {object} on:close={() => { dispatch('close') }}>
  <!-- <svelte:fragment slot="subtitle">
    <div class="flex-between flex-reverse" style="width: 100%">
      <Channels value={object.channels}/>
      <CircleButton icon={Edit} label={'Edit'} on:click={(ev) => showPopup(SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => { saveChannels(result) })} />      
    </div>
  </svelte:fragment> -->

  <div class="grid-cards">
    <CandidateCard />
    <VacancyCard />
  </div>

  <div class="attachments">
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
  .title, .city {
    font-weight: 500;
    font-size: .75rem;
    color: var(--theme-content-color);
  }
  .title { margin-top: .75rem; }
  .resume a {
    font-size: .75rem;
    color: var(--theme-content-dark-color);
    &:hover { color: var(--theme-content-color); }
  }

  .attachments {
    margin-top: 3.5rem;
  }

  .grid-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 1.5rem;
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
