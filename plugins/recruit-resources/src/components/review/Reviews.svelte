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
  import type { Doc, Ref } from '@anticrm/core'
  import core from '@anticrm/core'
  import { IntlString } from '@anticrm/platform'
  import calendar from '@anticrm/calendar'
  import { CircleButton, IconAdd, Label, showPopup } from '@anticrm/ui'
  import { Table } from '@anticrm/view-resources'
  import recruit from '../../plugin'
  import FileDuo from '../icons/FileDuo.svelte'
  import CreateReview from './CreateReview.svelte'

  export let objectId: Ref<Doc>
  export let reviews: number
  export let label: IntlString = recruit.string.Reviews

  const createApp = (ev: MouseEvent): void => {
    showPopup(CreateReview, { candidate: objectId, preserveCandidate: true }, ev.target as HTMLElement)
  }
</script>

<div class="applications-container">
  <div class="flex-row-center">
    <div class="title"><Label {label} /></div>
    <CircleButton icon={IconAdd} size={'small'} selected on:click={createApp} />
  </div>
  {#if reviews > 0}
    <Table
      _class={recruit.class.Review}
      config={[
        '',
        'verdict',
        {
          key: '',
          presenter: recruit.component.OpinionsPresenter,
          label: recruit.string.Opinions,
          sortingKey: 'opinions'
        },
        { key: '', presenter: calendar.component.DateTimePresenter, label: calendar.string.Date, sortingKey: 'date' }
      ]}
      options={{
        lookup: {
          space: core.class.Space
        }
      }}
      query={{ attachedTo: objectId }}
      loadingProps={{ length: reviews }}
    />
  {:else}
    <div class="flex-col-center mt-5 createapp-container">
      <FileDuo size={'large'} />
      <div class="small-text content-dark-color mt-2">
        <Label label={recruit.string.NoReviewForCandidate} />
      </div>
      <div class="text-sm">
        <div class="over-underline" on:click={createApp}><Label label={recruit.string.CreateAnReview} /></div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .applications-container {
    display: flex;
    flex-direction: column;

    .title {
      margin-right: 0.75rem;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--caption-color);
    }
  }

  .createapp-container {
    padding: 1rem;
    color: var(--caption-color);
    background: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.75rem;
  }
</style>
