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
  import presentation, { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Button, EditStyle, eventToHTMLElement, IconAdd, Label, showPopup } from '@hcengineering/ui'
  import { EditBoxPopup } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../../plugin'
  import IssuePresenter from '../IssuePresenter.svelte'
  import EstimationStatsPresenter from './EstimationStatsPresenter.svelte'
  import SubIssuesEstimations from './SubIssuesEstimations.svelte'
  import TimeSpendReportPopup from './TimeSpendReportPopup.svelte'
  import TimeSpendReports from './TimeSpendReports.svelte'

  export let format: 'text' | 'password' | 'number'
  export let kind: EditStyle = 'search-style'
  export let object: Issue

  $: _value = object.estimation

  const dispatch = createEventDispatcher()
  const client = getClient()

  $: childIds = Array.from((object.childInfo ?? []).map((it) => it.childId))

  const query = createQuery()

  let currentProject: Project | undefined

  $: query.query(
    object._class,
    { _id: object._id },
    (res) => {
      const r = res.shift()
      if (r !== undefined) {
        object = r
        currentProject = r.$lookup?.space
      }
    },
    {
      lookup: {
        space: tracker.class.Project
      }
    }
  )
  $: defaultTimeReportDay = currentProject?.defaultTimeReportDay
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<Card
  label={tracker.string.Estimation}
  canSave={true}
  okAction={() => {
    dispatch('close')
  }}
  okLabel={presentation.string.Ok}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close', null)
  }}
  on:changeContent
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
              value: object.estimation === 0 ? undefined : object.estimation,
              format,
              kind,
              placeholder: tracker.string.Estimation,
              maxDigitsAfterPoint: 3
            },
            eventToHTMLElement(evt),
            (res) => {
              if (typeof res === 'number') {
                if (_value !== res) {
                  _value = res
                  client.update(object, { estimation: res })
                  object.estimation = res
                }
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
    <IssuePresenter value={object} disabled />
  </svelte:fragment>

  {#if currentProject}
    <SubIssuesEstimations issue={object} projects={new Map([[currentProject?._id, currentProject]])} />
  {/if}

  {#if currentProject}
    <TimeSpendReports
      issue={object}
      projects={new Map([[currentProject?._id, currentProject]])}
      query={{ attachedTo: { $in: [object._id, ...childIds] } }}
    />
  {/if}
  <svelte:fragment slot="buttons">
    <Button
      icon={IconAdd}
      size={'large'}
      on:click={() => {
        showPopup(
          TimeSpendReportPopup,
          {
            issue: object,
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
