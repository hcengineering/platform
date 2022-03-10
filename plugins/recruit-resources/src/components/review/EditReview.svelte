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
  import contact from '@anticrm/contact'
  import { createQuery, getClient } from '@anticrm/presentation'
  import type { Candidate, Review, ReviewCategory } from '@anticrm/recruit'
  import { StyledTextBox } from '@anticrm/text-editor'
  import { EditBox, Grid, Label } from '@anticrm/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import recruit from '../../plugin'
  import CandidateCard from '../CandidateCard.svelte'
  import ExpandRightDouble from '../icons/ExpandRightDouble.svelte'
  import ReviewCategoryCard from './ReviewCategoryCard.svelte'

  export let object: Review
  let candidate: Candidate

  let reviewCategory: ReviewCategory

  const candidateQuery = createQuery()
  $: if (object !== undefined) {
    candidateQuery.query(recruit.mixin.Candidate, { _id: object.attachedTo }, (result) => {
      candidate = result[0]
    })
  }

  const reviewCategoryQuery = createQuery()
  $: if (candidate !== undefined) {
    reviewCategoryQuery.query(recruit.class.ReviewCategory, { _id: object.space }, (result) => {
      reviewCategory = result[0]
    })
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  onMount(() => {
    dispatch('open', { ignoreKeys: ['location', 'company', 'number', 'comments', 'startDate', 'description'] })
  })
</script>

{#if object !== undefined && candidate !== undefined}
  <div class="flex-between">
    <div class="card"><CandidateCard {candidate} /></div>
    <div class="arrows"><ExpandRightDouble /></div>
    <div class="card"><ReviewCategoryCard category={reviewCategory} /></div>
  </div>

  <div class="mt-4 mb-1">
    <Grid column={1}>
      <EditBox
      label={recruit.string.Company}
      bind:value={object.company}
      icon={contact.icon.Company}
      placeholder={recruit.string.Company}
      maxWidth="39rem"
      focus
      on:change={() => client.update(object, { company: object.company })}
      />
      <EditBox
      label={recruit.string.Location}
      bind:value={object.location}
      icon={recruit.icon.Location}
      placeholder={recruit.string.Location}
      maxWidth="39rem"
      focus
      on:change={() => client.update(object, { location: object.location })}
      />
    </Grid>
  </div>

  <div class="mt-4 mb-1">
    <Label label={recruit.string.Description} />
  </div>
  <div class="description flex">
    <StyledTextBox
      content={object.description}
      on:value={(evt) => {
        console.log(evt.detail)
        client.update(object, { description: evt.detail })
      }}
    />
  </div>

  <div class="mt-4 mb-1">
    <Label label={recruit.string.Verdict} />
  </div>
  <div class="description flex">
    <StyledTextBox
      content={object.verdict}
      on:value={(evt) => {
        client.update(object, { verdict: evt.detail })
      }}
    />
  </div>
{/if}

<style lang="scss">
  .card {
    align-self: stretch;
    width: calc(50% - 3.5rem);
  }
  .arrows {
    width: 4rem;
  }

  .description {
    height: 10rem;
    padding: 1rem;
    border: 1px solid var(--theme-menu-divider);
    border-radius: 8px;
  }
</style>
