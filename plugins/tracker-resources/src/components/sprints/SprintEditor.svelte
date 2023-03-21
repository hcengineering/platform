<!--
// Copyright © 2022-2023 Hardcore Engineering Inc.
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
  import { Ref } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Issue, IssueTemplate, Sprint, Project } from '@hcengineering/tracker'
  import {
    ButtonKind,
    ButtonShape,
    ButtonSize,
    DatePresenter,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { activeSprint } from '../../issues'
  import tracker from '../../plugin'
  import { getDayOfSprint } from '../../utils'
  import TimePresenter from '../issues/timereport/TimePresenter.svelte'
  import SprintSelector from './SprintSelector.svelte'

  export let value: Issue | IssueTemplate
  export let isEditable: boolean = true
  export let shouldShowLabel: boolean = true
  export let popupPlaceholder: IntlString = tracker.string.MoveToSprint
  export let shouldShowPlaceholder = true
  export let size: ButtonSize = 'large'
  export let kind: ButtonKind = 'link'
  export let shape: ButtonShape = undefined
  export let justify: 'left' | 'center' = 'left'
  export let width: string | undefined = '100%'
  export let onlyIcon: boolean = false

  export let groupBy: string | undefined = undefined
  export let enlargedText: boolean = false
  export let compression: boolean = false

  const client = getClient()
  const spaceQuery = createQuery()

  let currentProject: Project | undefined
  $: spaceQuery.query(tracker.class.Project, { _id: value.space }, (res) => {
    currentProject = res.shift()
  })

  const handleSprintIdChanged = async (newSprintId: Ref<Sprint> | null | undefined) => {
    if (!isEditable || newSprintId === undefined || value.sprint === newSprintId) {
      return
    }

    await client.update(value, { sprint: newSprintId })
  }

  const sprintQuery = createQuery()
  let sprint: Sprint | undefined
  $: if (value.sprint) {
    sprintQuery.query(tracker.class.Sprint, { _id: value.sprint }, (res) => {
      sprint = res.shift()
    })
  }

  $: twoRows = $deviceInfo.twoRows
</script>

{#if value.sprint || sprint}
  <div
    class="flex flex-wrap"
    class:minus-margin={kind === 'list-header'}
    class:min-w-0={compression}
    style:flex-direction={twoRows ? 'column' : 'row'}
  >
    {#if (value.sprint && value.sprint !== $activeSprint && groupBy !== 'sprint') || shouldShowPlaceholder}
      <div class="flex-row-center" class:minus-margin-vSpace={kind === 'list-header'} style:width>
        <SprintSelector
          {kind}
          {size}
          {shape}
          width={compression ? 'max-content' : 'min-content'}
          {justify}
          {isEditable}
          {shouldShowLabel}
          {popupPlaceholder}
          {onlyIcon}
          {enlargedText}
          showTooltip={{ label: value.sprint ? tracker.string.MoveToSprint : tracker.string.AddToSprint }}
          value={value.sprint}
          onChange={handleSprintIdChanged}
        />
      </div>
    {/if}

    {#if sprint && kind === 'list-header'}
      <div class="flex-row-center" class:minus-margin-space={kind === 'list-header'} class:text-sm={twoRows}>
        {#if sprint}
          {@const now = Date.now()}
          {@const sprintDaysFrom =
            now < sprint.startDate
              ? 0
              : now > sprint.targetDate
              ? getDayOfSprint(sprint.startDate, sprint.targetDate)
              : getDayOfSprint(sprint.startDate, now)}
          {@const sprintDaysTo = getDayOfSprint(sprint.startDate, sprint.targetDate)}
          <DatePresenter value={sprint.startDate} kind={'transparent'} />
          <span class="p-1"> / </span>
          <DatePresenter value={sprint.targetDate} kind={'transparent'} />
          <div class="w-2 min-w-2" />
          <!-- Active sprint in time -->
          <TimePresenter value={sprintDaysFrom} />
          /
          <TimePresenter value={sprintDaysTo} />
        {/if}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .minus-margin {
    margin-left: -0.5rem;
    &-vSpace {
      margin: -0.25rem 0;
    }
    &-space {
      margin: -0.25rem 0 -0.25rem 0.5rem;
    }
  }
</style>
