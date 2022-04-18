<script lang="ts">
  import type { Card } from '@anticrm/board'
  import { getClient } from '@anticrm/presentation'
  import { CheckBox, DatePresenter } from '@anticrm/ui'

  export let value: Card

  const client = getClient()
  const { date } = value
  let isChecked = date?.isChecked

  function update() {
    if (isChecked === undefined) return
    client.update(value, { date: { ...date, isChecked } })
  }

</script>

{#if date}
  <div class="flex-presenter flex-gap-1 h-full">
    <CheckBox bind:checked={isChecked} on:value={update} />
    <div class="flex-center h-full" on:click>
      <div class="flex-row-center background-button-bg-color border-radius-1 w-full">
        {#if date.startDate}
          <DatePresenter bind:value={date.startDate} />
        {/if}
        {#if date.startDate && date.dueDate}-{/if}
        {#if date.dueDate}
          <DatePresenter bind:value={date.dueDate} withTime={true} showIcon={false} />
        {/if}
      </div>
    </div>
  </div>
{/if}
