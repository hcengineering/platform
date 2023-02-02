<script lang="ts">
  import { DateRangeMode, Timestamp, TypeDate } from '@hcengineering/core'
  import { ticker, tooltip } from '@hcengineering/ui'
  import { DateEditor } from '@hcengineering/view-resources'
  import EmployeeStatusDueDatePopup from './EmployeeStatusDueDatePopup.svelte'
  import { formatDate } from '../utils'
  import { createEventDispatcher } from 'svelte'

  export let statusDueDate: Timestamp | undefined

  $: isOverdue = statusDueDate && statusDueDate < $ticker
  $: formattedDate = statusDueDate && formatDate(statusDueDate)

  const dispatch = createEventDispatcher()
  const type = { mode: DateRangeMode.DATETIME, withShift: true } as TypeDate
</script>

<div
  class="clear-mins"
  use:tooltip={{ direction: 'top', component: EmployeeStatusDueDatePopup, props: { formattedDate, isOverdue } }}
>
  <DateEditor
    value={statusDueDate}
    {type}
    onChange={(v) => {
      statusDueDate = v
      dispatch('change', v)
    }}
  />
</div>
