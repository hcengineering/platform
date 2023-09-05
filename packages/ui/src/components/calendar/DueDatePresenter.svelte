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
  import DueDatePopup from './DueDatePopup.svelte'
  import { tooltip } from '../../tooltips'
  import DatePresenter from './DatePresenter.svelte'
  import { getDaysDifference, getDueDateIconModifier, getFormattedDate } from './internal/DateUtils'
  import { ButtonKind, ButtonSize } from '../../types'

  export let value: number | null = null
  export let shouldRender: boolean = true
  export let onChange: (newDate: number | null) => void
  export let kind: ButtonKind = 'link'
  export let editable: boolean = true
  export let shouldIgnoreOverdue: boolean = false
  export let size: ButtonSize = 'medium'
  export let width: string | undefined = 'auto'

  const today = new Date(new Date(Date.now()).setHours(0, 0, 0, 0))
  $: isOverdue = value !== null && value < today.getTime()
  $: dueDate = value === null ? null : new Date(value)
  $: daysDifference = dueDate === null ? null : getDaysDifference(today, dueDate)
  $: iconModifier = getDueDateIconModifier(isOverdue, daysDifference, shouldIgnoreOverdue)
  let formattedDate = getFormattedDate(value)
  $: formattedDate = getFormattedDate(value)

  const handleDueDateChanged = async (event: CustomEvent<Timestamp>) => {
    const newDate = event.detail

    if (newDate === undefined || value === newDate || !editable) {
      return
    }

    onChange(newDate)
  }
</script>

{#if shouldRender}
  <div
    class="clear-mins"
    style:width
    use:tooltip={formattedDate
      ? {
          direction: 'top',
          component: DueDatePopup,
          props: {
            formattedDate,
            daysDifference,
            isOverdue,
            iconModifier,
            shouldIgnoreOverdue
          }
        }
      : undefined}
  >
    <DatePresenter
      {value}
      {editable}
      {iconModifier}
      {kind}
      {size}
      {width}
      {shouldIgnoreOverdue}
      on:change={handleDueDateChanged}
    />
  </div>
{/if}
