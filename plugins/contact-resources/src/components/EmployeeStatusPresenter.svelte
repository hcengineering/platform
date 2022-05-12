<script lang="ts">
  import { Employee, Status } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { Label, Tooltip } from '@anticrm/ui'
  import { createQuery } from '@anticrm/presentation'
  import contact from '../plugin'
  import { formatDate } from '../utils'
  import { IntlString } from '@anticrm/platform'

  export let employeeId: Ref<Employee>
  export let withTooltip: boolean = true

  const statusQuery = createQuery()
  let status: Status

  $: statusQuery.query(contact.class.Status, { attachedTo: employeeId }, (res) => {
    status = res[0]
  })

  $: formattedDate = formatDate(status?.dueDate) as IntlString
</script>

{#if status}
  {#if withTooltip}
    <Tooltip
      label={status?.dueDate ? contact.string.StatusDueDateTooltip : contact.string.NoExpire}
      props={{ date: formattedDate }}
    >
      <div class="overflow-label statusName">{status?.name}</div>
    </Tooltip>
  {:else}
    <div class="flex">
      <div class="pr-4">{status?.name}</div>
      {#if status?.dueDate}
        <div>{formatDate(status?.dueDate)}</div>
      {:else}
        <Label label={contact.string.NoExpire} />
      {/if}
    </div>
  {/if}
{/if}

<style lang="scss">
  .statusName {
    max-width: 16rem;
  }
</style>
