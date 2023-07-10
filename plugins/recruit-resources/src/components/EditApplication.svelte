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
  import { createQuery } from '@hcengineering/presentation'
  import type { Applicant, Candidate, Vacancy } from '@hcengineering/recruit'
  import { Scroller } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import CandidateCard from './CandidateCard.svelte'
  import VacancyCard from './VacancyCard.svelte'
  import ExpandRightDouble from './icons/ExpandRightDouble.svelte'

  import { Ref } from '@hcengineering/core'
  import recruit from '../plugin'
  import Reviews from './review/Reviews.svelte'

  export let object: Applicant
  let candidate: Candidate
  let vacancy: Vacancy

  const dispatch = createEventDispatcher()
  const sendOpen = () => {
    if (object !== undefined && object.number !== undefined) {
      dispatch('open', {
        ignoreKeys: ['comments', 'number'],
        allowedCollections: ['labels'],
        title: `APP-${object.number}`
      })
    }
  }

  const candidateQuery = createQuery()
  $: if (object !== undefined) {
    candidateQuery.query(recruit.mixin.Candidate, { _id: object.attachedTo as Ref<Candidate> }, (result) => {
      candidate = result[0]
      sendOpen()
    })
  }

  const vacancyQuery = createQuery()
  $: if (object !== undefined) {
    vacancyQuery.query(recruit.class.Vacancy, { _id: object.space }, (result) => {
      vacancy = result[0]
    })
  }

  onMount(() => {
    sendOpen()
  })
</script>

{#if object !== undefined && candidate !== undefined}
  <Scroller horizontal stickedScrollBars>
    <div class="flex-between min-w-min">
      <div class="card"><CandidateCard {candidate} on:click /></div>
      <div class="flex-center arrows"><ExpandRightDouble /></div>
      <div class="card"><VacancyCard {vacancy} /></div>
    </div>
  </Scroller>
  <div class="mt-6">
    <Reviews
      objectId={candidate._id}
      reviews={candidate.reviews ?? 0}
      label={recruit.string.TalentReviews}
      application={object?._id}
      company={vacancy?.company}
    />
  </div>
{/if}

<style lang="scss">
  .card {
    flex-shrink: 0;
    align-self: stretch;
    width: calc(50% - 5rem);
    min-width: max-content;
    min-height: 16rem;
  }
  .arrows {
    flex-shrink: 0;
    width: 4rem;
  }
</style>
