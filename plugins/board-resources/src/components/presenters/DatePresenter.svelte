<script lang="ts">
  import type { CardDate } from '@anticrm/board'
  import { Button, CheckBox } from '@anticrm/ui'

  // TODO: implement
  export let value: CardDate
  const dateLabel = value.dueDate ? `${value.startDate} - ${value.dueDate}` : value.startDate
</script>

{#if value}
  <div class="flex">
    <CheckBox checked={value.isChecked} />
    <Button size="small" kind="transparent" on:click>
      <div class="flex-center h-full w-full" slot="content">
        {dateLabel}
      </div>
    </Button>
  </div>
{/if}
