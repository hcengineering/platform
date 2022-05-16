<script lang="ts">
  import { Employee, Status } from '@anticrm/contact'
  import { WithLookup } from '@anticrm/core'
  import { Label, Tooltip } from '@anticrm/ui'
  import contact from '../plugin'
  import { formatDate } from '../utils'
  import { IntlString } from '@anticrm/platform'

  export let employee: WithLookup<Employee>
  export let withTooltip: boolean = true

  $: status = employee?.$lookup?.statuses?.[0] as Status | undefined
  $: formattedDate = status && (formatDate(status.dueDate) as IntlString)
</script>

{#if status}
  {#if withTooltip}
    <Tooltip
      label={status.dueDate ? contact.string.StatusDueDateTooltip : contact.string.NoExpire}
      props={{ date: formattedDate }}
    >
      <div class="overflow-label statusName">{status.name}</div>
    </Tooltip>
  {:else}
    <div class="flex">
      <div class="pr-4">{status.name}</div>
      {#if status.dueDate}
        <div>{formattedDate}</div>
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
