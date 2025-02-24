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
  import { Project } from '@hcengineering/task'
  import TeamCalendar from './TeamCalendar.svelte'
  import TeamCalendarDay from './TeamCalendarDay.svelte'
  import { Ref } from '@hcengineering/core'
  import Header from '../../Header.svelte'
  import { DropdownLabels, DropdownLabelsIntl } from '@hcengineering/ui'
  import time from '../../../plugin'

  export let space: Ref<Project>
  export let currentDate: Date

  let mode: 'week' | 'day' = 'day'

  let timeMode: '1hour' | '30mins' | '15mins'
</script>

<Header bind:currentDate>
  {#if mode === 'day'}
    <DropdownLabels
      items={[
        { id: '1hour', label: '1 hour' },
        { id: '30mins', label: '30 mins' },
        { id: '15mins', label: '15 mins' }
      ]}
      bind:selected={timeMode}
      kind={'regular'}
      size={'medium'}
      showDropdownIcon
    />
  {/if}
  <DropdownLabelsIntl
    items={[
      { id: 'day', label: time.string.DayCalendar },
      { id: 'week', label: time.string.WeekCalendar }
    ]}
    bind:selected={mode}
    kind={'regular'}
    size={'medium'}
  />
  <div class="hulyHeader-divider short" />
</Header>

{#if mode === 'week'}
  <TeamCalendar {space} {currentDate} />
{:else if mode === 'day'}
  <TeamCalendarDay {space} {currentDate} {timeMode} />
{/if}
