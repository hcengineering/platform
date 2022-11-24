<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { DropdownIntlItem, DropdownLabelsIntl } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { WorkDaysType } from '../../../types'
  import { getWorkDate, getWorkDayType } from '../../../utils'
  import WorkDaysIcon from './WorkDaysIcon.svelte'

  export let dateTimestamp: number

  const workDaysDropdownItems: DropdownIntlItem[] = [
    {
      id: WorkDaysType.CURRENT,
      label: tracker.string.WorkDayCurrent
    },
    {
      id: WorkDaysType.PREVIOUS,
      label: tracker.string.WorkDayPrevious
    }
  ]

  $: selectedWorkDayType = dateTimestamp ? getWorkDayType(dateTimestamp) : undefined
</script>

<DropdownLabelsIntl
  kind="link-bordered"
  icon={WorkDaysIcon}
  shouldUpdateUndefined={false}
  label={tracker.string.WorkDayLabel}
  items={workDaysDropdownItems}
  bind:selected={selectedWorkDayType}
  on:selected={({ detail }) => (dateTimestamp = getWorkDate(detail))}
/>
