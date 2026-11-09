<!--
// Copyright © 2022 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { createEventDispatcher } from 'svelte'
  import { TimeReportDayType } from '@hcengineering/tracker'
  import { DropdownIntlItem, DropdownLabelsIntl } from '@hcengineering/ui'
  import type { ButtonKind, ButtonSize } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import TimeReportDayIcon from './TimeReportDayIcon.svelte'

  export let label = tracker.string.TimeReportDayTypeLabel
  const dispatch = createEventDispatcher<{ selected: TimeReportDayType }>()

  function handleSelected (event: CustomEvent<TimeReportDayType>): void {
    dispatch('selected', event.detail)
  }

  export let selected: TimeReportDayType | undefined
  export let kind: ButtonKind = 'link-bordered'
  export let size: ButtonSize = 'small'

  const workDaysDropdownItems: Array<DropdownIntlItem<TimeReportDayType>> = [
    {
      id: TimeReportDayType.CurrentWorkDay,
      label: tracker.string.CurrentWorkDay
    },
    {
      id: TimeReportDayType.PreviousWorkDay,
      label: tracker.string.PreviousWorkDay
    }
  ]
</script>

<DropdownLabelsIntl
  {kind}
  {size}
  icon={TimeReportDayIcon}
  shouldUpdateUndefined={false}
  {label}
  items={workDaysDropdownItems}
  bind:selected
  on:selected={handleSelected}
/>
