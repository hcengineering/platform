<script lang="ts">
  import type { CardDate } from '@anticrm/board'
  import { CheckBox, DatePresenter } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let value: CardDate
  export let isInline: boolean = false
  export let size: 'x-small' | 'small' = 'small'

  let isChecked = value?.isChecked
  const dispatch = createEventDispatcher()
  const isOverdue = !!value?.dueDate && (new Date()).getTime() > value.dueDate

  function check () {
    if (isChecked === undefined || !value) return
    dispatch('update', { ...value, isChecked })
  }
</script>

{#if value}
  <div class="flex-presenter flex-gap-1 h-full">
    {#if value.dueDate}
      <CheckBox bind:checked={isChecked} on:value={check} />
    {/if}
    <div class="flex-center h-full" on:click>
      <div class="flex-row-center background-button-bg-color pr-1 pl-1 border-radius-1 w-full">
        {#if value.startDate}
          <DatePresenter bind:value={value.startDate} {size} kind="transparent" />
        {/if}
        {#if value.startDate && value.dueDate}-{/if}
        {#if value.dueDate}
          <DatePresenter bind:value={value.dueDate} withTime={true} icon={isOverdue ? 'overdue' : undefined} {size} kind="transparent" />
        {/if}
      </div>
    </div>
  </div>
{/if}
