<script lang="ts">
  import { Employee, Status } from '@anticrm/contact'
  import { Ref } from '@anticrm/core'
  import { Label } from '@anticrm/ui'
  import { createQuery, getClient } from '@anticrm/presentation'
  import contact from '../plugin'
  import { formatDate } from '../utils'

  export let employeeId: Ref<Employee>
  export let withTooltip: boolean = true

  const client = getClient()
  const statusQuery = createQuery()
  let status: Status

  $: statusQuery.query(contact.class.Status, { attachedTo: employeeId }, (res) => {
    status = res[0]
    checkOverdue()
  })

  async function checkOverdue () {
    if (status?.dueDate && status?.dueDate < Date.now()) {
      await client.remove(status)
    }
  }
</script>

{#if status}
  {#if withTooltip}
    <div class="tooltip-container">
      <div class="tooltip">
        {#if status?.dueDate}
          <div>{formatDate(status?.dueDate)}</div>
        {:else}
          <Label label={contact.string.NoExpire} />
        {/if}
      </div>
      <div>{status?.name}</div>
    </div>
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
  .tooltip-container {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0;
    min-height: 0;
    width: min-content;

    .tooltip {
      overflow: hidden;
      position: absolute;
      padding: 0.25rem 0.5rem;
      bottom: 100%;
      left: 50%;
      width: auto;
      min-width: 0;
      white-space: nowrap;
      text-overflow: ellipsis;
      background-color: var(--accent-bg-color);
      border: 1px solid var(--button-border-color);
      border-radius: 0.25rem;
      transform-origin: center center;
      transform: translate(-50%, -0.25rem) scale(0.9);
      opacity: 0;
      box-shadow: var(--accent-shadow);
      transition-property: transform, opacity;
      transition-duration: 0.15s;
      transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: none;
      z-index: 1000;
    }

    &:hover .tooltip {
      transform: translate(-50%, 150%) scale(1);
      opacity: 1;
    }
  }
</style>
