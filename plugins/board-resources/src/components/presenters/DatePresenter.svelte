<script lang="ts">
  import type { CardDate } from '@anticrm/board'
  import { CheckBox, DatePresenter } from '@anticrm/ui'

  // TODO: implement
  export let value: CardDate

</script>

{#if value}
  <div class="flex-presenter flex-gap-1 h-full">
    <CheckBox checked={value.isChecked} />
    <div class="flex-center h-full">
      <div class="flex-row-center background-button-bg-color border-radius-1 w-full">
        {#if value.startDate && value.dueDate}
          <DatePresenter bind:value={value.startDate} showIcon={false} />
          -
          <DatePresenter bind:value={value.dueDate} withTime={true} showIcon={false} />
        {:else if value.startDate}
          <DatePresenter bind:value={value.startDate} />
        {:else if value.dueDate}
          <DatePresenter bind:value={value.dueDate} withTime={true} showIcon={false} />
        {/if}
      </div>
    </div>
  </div>
{/if}
