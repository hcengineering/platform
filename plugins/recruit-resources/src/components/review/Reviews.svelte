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
  import calendar from '@hcengineering/calendar'
  import { Organization } from '@hcengineering/contact'
  import { DateRangeMode, Doc, FindOptions, Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { Applicant, Review } from '@hcengineering/recruit'
  import { Button, DatePresenter, IconAdd, Label, Scroller, showPopup } from '@hcengineering/ui'
  import { Table } from '@hcengineering/view-resources'
  import recruit from '../../plugin'
  import FileDuo from '../icons/FileDuo.svelte'
  import SectionEmpty from '../SectionEmpty.svelte'
  import CreateReview from './CreateReview.svelte'

  export let objectId: Ref<Doc>
  export let reviews: number
  export let label: IntlString = recruit.string.Reviews
  export let application: Ref<Applicant> | undefined
  export let company: Ref<Organization> | undefined
  export let readonly: boolean = false

  const createApp = (): void => {
    if (readonly) return
    showPopup(
      CreateReview,
      {
        candidate: objectId,
        preserveCandidate: true,
        application,
        company
      },
      'top'
    )
  }
  const options: FindOptions<Review> = {
    lookup: {
      application: recruit.class.Applicant
    },
    showArchived: true
  }
</script>

<div class="antiSection">
  <div class="antiSection-header">
    <span class="antiSection-header__title">
      <Label {label} />
    </span>
    {#if !readonly}
      <Button icon={IconAdd} kind={'ghost'} on:click={createApp} />
    {/if}
  </div>
  {#if reviews > 0}
    <Scroller horizontal>
      <Table
        _class={recruit.class.Review}
        config={[
          '',
          '$lookup.application',
          'company',
          'verdict',
          {
            key: '',
            presenter: recruit.component.OpinionsPresenter,
            label: recruit.string.Opinions,
            sortingKey: 'opinions'
          },
          {
            key: 'date',
            presenter: DatePresenter,
            label: calendar.string.Date,
            sortingKey: 'date',
            props: {
              editable: false,
              mode: DateRangeMode.DATE
            }
          }
        ]}
        {options}
        {readonly}
        query={{ attachedTo: objectId }}
        loadingProps={{ length: reviews }}
      />
    </Scroller>
  {:else}
    <SectionEmpty icon={FileDuo} label={recruit.string.NoReviewForCandidate}>
      {#if !readonly}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <span class="over-underline content-color" on:click={createApp}>
          <Label label={recruit.string.CreateAnReview} />
        </span>
      {/if}
    </SectionEmpty>
  {/if}
</div>
