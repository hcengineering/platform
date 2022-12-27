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
  import { SortingOrder, WithLookup } from '@hcengineering/core'
  import presentation, { Card, createQuery } from '@hcengineering/presentation'
  import { Issue, IssueStatus, Team } from '@hcengineering/tracker'
  import { Button, EditBox, EditStyle, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import IssuePresenter from '../IssuePresenter.svelte'
  import EstimationStatsPresenter from './EstimationStatsPresenter.svelte'
  import SubIssuesEstimations from './SubIssuesEstimations.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'
  import TimeSpendReports from './TimeSpendReports.svelte'

  export let value: string | number | undefined
  export let format: 'text' | 'password' | 'number'
  export let kind: EditStyle = 'search-style'
  export let object: Issue

  let _value = value

  const dispatch = createEventDispatcher()

  function _onkeypress (ev: KeyboardEvent) {
    if (ev.key === 'Enter') dispatch('close', _value)
  }

  $: childIds = Array.from((object.childInfo ?? []).map((it) => it.childId))

  const query = createQuery()

  let currentTeam: Team | undefined
  let issueStatuses: WithLookup<IssueStatus>[] | undefined

  $: defaultTimeReportDay = object.defaultTimeReportDay
  $: query.query(
    object._class,
    { _id: object._id },
    (res) => {
      const r = res.shift()
      if (r !== undefined) {
        object = r
        currentTeam = r.$lookup?.space
      }
    },
    {
      lookup: {
        space: tracker.class.Team
      }
    }
  )

  const statusesQuery = createQuery()

  $: currentTeam &&
    statusesQuery.query(
      tracker.class.IssueStatus,
      { attachedTo: currentTeam._id },
      (statuses) => (issueStatuses = statuses),
      {
        lookup: { category: tracker.class.IssueStatusCategory },
        sort: { rank: SortingOrder.Ascending }
      }
    )
</script>

<Card
  label={tracker.string.Estimation}
  canSave={true}
  okAction={() => {
    dispatch('close', _value)
  }}
  okLabel={presentation.string.Save}
  on:close={() => {
    dispatch('close', null)
  }}
>
  <svelte:fragment slot="title">
    <div class="flex-row-center">
      <Label label={tracker.string.Estimation} />
      <div class="ml-2">
        <EstimationStatsPresenter value={object} />
      </div>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="header">
    <IssuePresenter value={object} disableClick />
  </svelte:fragment>
  <div class="header no-border flex-col p-1">
    <div class="flex-row-center flex-between">
      <EditBox
        bind:value={_value}
        {format}
        {kind}
        placeholder={tracker.string.Estimation}
        focus
        maxDigitsAfterPoint={3}
        on:keypress={_onkeypress}
        on:change={() => {
          if (typeof _value === 'number') {
            object.estimation = _value
          }
        }}
      />
    </div>
  </div>
  {#if currentTeam && issueStatuses}
    <SubIssuesEstimations
      issue={object}
      issueStatuses={new Map([[currentTeam._id, issueStatuses]])}
      teams={new Map([[currentTeam?._id, currentTeam]])}
    />
  {/if}

  {#if currentTeam}
    <TimeSpendReports
      issue={object}
      teams={new Map([[currentTeam?._id, currentTeam]])}
      query={{ attachedTo: { $in: [object._id, ...childIds] } }}
    />
  {/if}
  <svelte:fragment slot="buttons">
    <Button
      icon={IconAdd}
      size={'small'}
      on:click={(event) => {
        showPopup(TimeSpendReportPopup, {
          issueId: object._id,
          issueClass: object._class,
          space: object.space,
          assignee: object.assignee,
          defaultTimeReportDay
        })
      }}
      label={tracker.string.TimeSpendReportAdd}
    />
  </svelte:fragment>
</Card>
