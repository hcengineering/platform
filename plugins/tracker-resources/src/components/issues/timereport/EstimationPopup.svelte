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
  import { Button, EditStyle, eventToHTMLElement, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import EditBoxPopup from '@hcengineering/view-resources/src/components/EditBoxPopup.svelte'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import IssuePresenter from '../IssuePresenter.svelte'
  import EstimationStatsPresenter from './EstimationStatsPresenter.svelte'
  import SubIssuesEstimations from './SubIssuesEstimations.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'
  import TimeSpendReports from './TimeSpendReports.svelte'

  export let value: number
  export let format: 'text' | 'password' | 'number'
  export let kind: EditStyle = 'search-style'
  export let object: Issue

  let _value = value

  const dispatch = createEventDispatcher()

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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<Card
  label={tracker.string.Estimation}
  canSave={true}
  okAction={() => {
    dispatch('close', _value)
  }}
  okLabel={_value !== value ? presentation.string.Save : presentation.string.Close}
  on:close={() => {
    dispatch('close', null)
  }}
>
  <svelte:fragment slot="title">
    <div class="flex-row-center">
      <Label label={tracker.string.Estimation} />
      <div
        class="ml-2 mr-4"
        on:click={(evt) => {
          showPopup(
            EditBoxPopup,
            {
              value: _value === 0 ? undefined : _value,
              format,
              kind,
              placeholder: tracker.string.Estimation,
              maxDigitsAfterPoint: 3
            },
            eventToHTMLElement(evt),
            (res) => {
              if (typeof res === 'number') {
                _value = res
              }
            }
          )
        }}
      >
        <EstimationStatsPresenter value={object} estimation={_value} />
      </div>
    </div>
  </svelte:fragment>

  <svelte:fragment slot="header">
    <IssuePresenter value={object} disableClick />
  </svelte:fragment>

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
        showPopup(
          TimeSpendReportPopup,
          {
            issueId: object._id,
            issueClass: object._class,
            space: object.space,
            assignee: object.assignee,
            defaultTimeReportDay
          },
          'top'
        )
      }}
      label={tracker.string.TimeSpendReportAdd}
    />
  </svelte:fragment>
</Card>
