<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { SortingOrder } from '@hcengineering/core'
  import { Scrum, ScrumRecord } from '@hcengineering/tracker'
  import { Button, Icon, IconDetails, IconDetailsFilled } from '@hcengineering/ui'
  import { List } from '@hcengineering/view-resources'
  import tracker from '../../plugin'
  import RecordScrumButton from './RecordScrumButton.svelte'
  import ScrumEditor from './ScrumEditor.svelte'
  import ScrumHeader from './ScrumHeader.svelte'
  import ScrumRecordPresenter from './ScrumRecordPresenter.svelte'
  import { ActionContext } from '@hcengineering/presentation'

  export let scrum: Scrum
  export let activeScrumRecord: ScrumRecord | undefined

  let asideShown = true

  $: query = { space: scrum.space, attachedTo: scrum._id }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<ScrumHeader {scrum}>
  <svelte:fragment slot="options">
    <RecordScrumButton {scrum} {activeScrumRecord} />
    <Button
      icon={asideShown ? IconDetailsFilled : IconDetails}
      kind={'transparent'}
      size={'medium'}
      selected={asideShown}
      on:click={() => (asideShown = !asideShown)}
    />
  </svelte:fragment>
</ScrumHeader>
<div class="top-divider flex w-full h-full clear-mins">
  <List
    _class={tracker.class.ScrumRecord}
    space={scrum.space}
    {query}
    viewOptions={{
      orderBy: ['modifiedOn', SortingOrder.Descending],
      groupBy: []
    }}
    config={[
      { key: '', presenter: Icon, props: { icon: tracker.icon.Scrum, size: 'small' } },
      { key: '', presenter: ScrumRecordPresenter },
      {
        key: 'modifiedOn',
        presenter: tracker.component.ModificationDatePresenter
      }
    ]}
    disableHeader
  />
  {#if asideShown}
    <ScrumEditor bind:scrum />
  {/if}
</div>
