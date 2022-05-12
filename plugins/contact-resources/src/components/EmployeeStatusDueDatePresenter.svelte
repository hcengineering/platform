<script lang="ts">
  import { Timestamp, TypeDate } from '@anticrm/core'
  import { ticker, Tooltip } from '@anticrm/ui'
  import { DateEditor } from '@anticrm/view-resources'
  import EmployeeStatusDueDatePopup from './EmployeeStatusDueDatePopup.svelte'
  import { formatDate } from '../utils'
  import { createEventDispatcher } from 'svelte'

  export let statusDueDate: Timestamp | undefined

  $: isOverdue = statusDueDate && statusDueDate < $ticker
  $: formattedDate = statusDueDate && formatDate(statusDueDate)

  const dispatch = createEventDispatcher()
  const type = { withTime: true } as TypeDate
</script>

<Tooltip
  direction={'top'}
  component={EmployeeStatusDueDatePopup}
  props={{
    formattedDate,
    isOverdue
  }}
>
  <DateEditor
    value={statusDueDate}
    {type}
    onChange={(v) => {
      statusDueDate = v
      dispatch('change', v)
    }}
  />
</Tooltip>
