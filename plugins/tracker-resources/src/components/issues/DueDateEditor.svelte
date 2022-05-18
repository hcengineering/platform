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
  import { getClient } from '@anticrm/presentation'
  import { Issue } from '@anticrm/tracker'
  import { DatePresenter, getDaysDifference } from '@anticrm/ui'
  import { getDueDateIconModifier } from '../../utils'

  export let value: Issue

  const client = getClient()

  const handleDueDateChanged = async (newDueDate: number | undefined) => {
    if (newDueDate === undefined || value.dueDate === newDueDate) {
      return
    }

    await client.update(value, { dueDate: newDueDate })
  }

  $: today = new Date(new Date(Date.now()).setHours(0, 0, 0, 0))
  $: isOverdue = value.dueDate !== null && value.dueDate < today.getTime()
  $: dueDate = value.dueDate === null ? null : new Date(value.dueDate)
  $: daysDifference = dueDate === null ? null : getDaysDifference(today, dueDate)
  $: iconModifier = getDueDateIconModifier(isOverdue, daysDifference)
</script>

{#if value}
  <!-- TODO: fix button style and alignment -->
  <DatePresenter
    kind="transparent"
    value={value.dueDate}
    icon={iconModifier}
    editable
    on:change={({ detail }) => handleDueDateChanged(detail)}
  />
{/if}
