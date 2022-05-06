<script lang="ts">
  import { Timestamp } from '@anticrm/core'
  import { DatePresenter, Tooltip } from '@anticrm/ui'
  import EmployeeStatusDueDatePopup from './EmployeeStatusDueDatePopup.svelte'
  import { formatDate } from '../utils'

  export let statusDueDate: Timestamp | undefined

  $: today = new Date(Date.now())
  $: dueDateMs = statusDueDate
  $: isOverdue = dueDateMs !== undefined && dueDateMs !== null && dueDateMs < today.getTime()
  $: formattedDate = formatDate(dueDateMs)
</script>

<Tooltip
  direction={'top'}
  component={EmployeeStatusDueDatePopup}
  props={{
    formattedDate: formattedDate,
    isOverdue
  }}
>
  <DatePresenter bind:value={statusDueDate} editable={true} shouldShowLabel={true} withTime={true} on:change />
</Tooltip>
