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
  import { Timestamp } from '@hcengineering/core'
  import { DatePresenter, tooltip, getDaysDifference } from '@hcengineering/ui'
  import DueDatePopup from './DueDatePopup.svelte'
  import { getDueDateIconModifier } from '../utils'

  export let dateMs: number | null = null
  export let shouldRender: boolean = true
  export let onDateChange: (newDate: number | null) => void
  export let kind: 'transparent' | 'primary' | 'link' | 'list' = 'primary'
  export let editable: boolean = true

  $: today = new Date(new Date(Date.now()).setHours(0, 0, 0, 0))
  $: isOverdue = dateMs !== null && dateMs < today.getTime()
  $: dueDate = dateMs === null ? null : new Date(dateMs)
  $: daysDifference = dueDate === null ? null : getDaysDifference(today, dueDate)
  $: iconModifier = getDueDateIconModifier(isOverdue, daysDifference)
  $: formattedDate = !dateMs ? '' : new Date(dateMs).toLocaleString('default', { month: 'short', day: 'numeric' })

  const handleDueDateChanged = async (event: CustomEvent<Timestamp>) => {
    const newDate = event.detail

    if (newDate === undefined || dateMs === newDate || !editable) {
      return
    }

    onDateChange(newDate)
  }
</script>

{#if shouldRender}
  {#if formattedDate}
    <div
      class="clear-mins"
      class:label-wrapper={kind === 'list'}
      use:tooltip={{
        direction: 'top',
        component: DueDatePopup,
        props: {
          formattedDate,
          daysDifference,
          isOverdue,
          iconModifier
        }
      }}
    >
      <DatePresenter
        value={dateMs}
        {editable}
        shouldShowLabel={false}
        icon={iconModifier}
        {kind}
        on:change={handleDueDateChanged}
      />
    </div>
  {:else}
    <DatePresenter
      value={dateMs}
      {editable}
      shouldShowLabel={false}
      icon={iconModifier}
      {kind}
      on:change={handleDueDateChanged}
    />
  {/if}
{/if}
