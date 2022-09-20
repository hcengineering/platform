<script lang="ts">
  import { Employee, Status } from '@hcengineering/contact'
  import { WithLookup } from '@hcengineering/core'
  import { Label, tooltip } from '@hcengineering/ui'
  import contact from '../plugin'
  import { formatDate } from '../utils'
  import { IntlString } from '@hcengineering/platform'

  export let employee: WithLookup<Employee>
  export let withTooltip: boolean = true

  $: status = employee?.$lookup?.statuses?.[0] as Status | undefined
  $: formattedDate = status && (formatDate(status.dueDate) as IntlString)
</script>

{#if status}
  {#if withTooltip}
    <div
      class="overflow-label statusName"
      use:tooltip={{
        label: status.dueDate ? contact.string.StatusDueDateTooltip : contact.string.NoExpire,
        props: { date: formattedDate }
      }}
    >
      {status.name}
    </div>
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
