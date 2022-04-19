<script lang="ts">
  import type { CardDate } from '@anticrm/board'
  import { CheckBox, DatePresenter } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'

  export let value: CardDate
  export let isInline: boolean = false

  let isChecked = value?.isChecked
  const dispatch = createEventDispatcher()

  function check () {
    if (isInline || isChecked === undefined || !value) return
    dispatch('update', { ...value, isChecked })
  }
</script>

{#if value}
  <div class="flex-presenter flex-gap-1 h-full">
    <CheckBox bind:checked={isChecked} on:value={check} />
    <div class="flex-center h-full" on:click>
      <div class="flex-row-center background-button-bg-color border-radius-1 w-full">
        {#if value.startDate}
          <DatePresenter bind:value={value.startDate} />
        {/if}
        {#if value.startDate && value.dueDate}-{/if}
        {#if value.dueDate}
          <DatePresenter bind:value={value.dueDate} withTime={true} showIcon={false} />
        {/if}
      </div>
    </div>
  </div>
{/if}
