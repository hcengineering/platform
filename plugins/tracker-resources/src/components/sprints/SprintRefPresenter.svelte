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
  import { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Sprint } from '@hcengineering/tracker'
  import { ButtonKind, DatePresenter, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'
  import tracker from '../../plugin'
  import { getDayOfSprint } from '../../utils'
  import TimePresenter from '../issues/timereport/TimePresenter.svelte'
  import SprintSelector from './SprintSelector.svelte'

  export let value: Ref<Sprint>
  export let kind: ButtonKind = 'link'

  const sprintQuery = createQuery()
  let sprint: Sprint | undefined
  $: sprintQuery.query(tracker.class.Sprint, { _id: value }, (res) => {
    ;[sprint] = res
  })

  $: twoRows = $deviceInfo.twoRows
</script>

<div
  class="flex flex-wrap"
  class:minus-margin={kind === 'list-header'}
  style:flex-direction={twoRows ? 'column' : 'row'}
>
  <div class="flex-row-center" class:minus-margin-vSpace={kind === 'list-header'}>
    <SprintSelector {kind} isEditable={false} enlargedText {value} />
  </div>

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
