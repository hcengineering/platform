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
  import type { Ref } from '@anticrm/core'
  import { createQuery } from '@anticrm/presentation'
  import { Panel } from '@anticrm/panel'
  import type { Candidate, Applicant, Vacancy } from '@anticrm/recruit'
  import Contact from './icons/Contact.svelte'
  import Attachments from './Attachments.svelte'
  import CandidateCard from './CandidateCard.svelte'
  import VacancyCard from './VacancyCard.svelte'

  import recruit from '../plugin'
  import { formatName } from '@anticrm/contact'
  import ApplicantHeader from './ApplicantHeader.svelte'

  export let _id: Ref<Applicant>
  let object: Applicant
  let candidate: Candidate
  let vacancy: Vacancy

  const query = createQuery()
  $: query.query(recruit.class.Applicant, { _id }, result => { object = result[0] })

  const candidateQuery = createQuery()
  $: if (object !== undefined) candidateQuery.query(recruit.class.Candidate, { _id: object.attachedTo }, result => { candidate = result[0] })

  const vacancyQuery = createQuery()
  $: if (object !== undefined) vacancyQuery.query(recruit.class.Vacancy, { _id: object.space }, result => { vacancy = result[0] })

  const dispatch = createEventDispatcher()
</script>

{#if object !== undefined && candidate !== undefined}
<Panel icon={Contact} title={formatName(candidate.name)} {object} on:close={() => { dispatch('close') }}>
  <ApplicantHeader {object} slot="subtitle" />

  <div class="grid-cards">
    <CandidateCard {candidate}/>
    <VacancyCard {vacancy}/>
  </div>

  <div class="attachments">
    <Attachments objectId={object._id} _class={object._class} space={object.space} {object}/>
  </div>

</Panel>
{/if}

<style lang="scss">
  .attachments {
    margin-top: 3.5rem;
  }

  .grid-cards {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 1.5rem;
  }
</style>
