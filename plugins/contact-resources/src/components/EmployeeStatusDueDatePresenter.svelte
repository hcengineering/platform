<script lang="ts">
  import { Timestamp } from '@anticrm/core'
  import { DatePresenter, ticker, Tooltip } from '@anticrm/ui'
  import EmployeeStatusDueDatePopup from './EmployeeStatusDueDatePopup.svelte'
  import { formatDate } from '../utils'

  export let statusDueDate: Timestamp | undefined

  $: isOverdue = statusDueDate && statusDueDate < $ticker
  $: formattedDate = statusDueDate && formatDate(statusDueDate)
</script>

<Tooltip
  direction={'top'}
  component={EmployeeStatusDueDatePopup}
  props={{
    formattedDate,
    isOverdue
  }}
>
  <DatePresenter bind:value={statusDueDate} editable={true} shouldShowLabel={true} withTime={true} on:change />
</Tooltip>
