<script lang="ts">
  import { Button, numberToHexColor } from '@anticrm/ui'
  import type { CardLabel } from '@anticrm/board'

  export let value: CardLabel
  export let size: 'large' | 'medium'

  const background = numberToHexColor(value.color)

</script>

{#if value}
  <div style:background class="border-radius-1">
    <Button {size} kind="transparent" on:click>
      <div class="flex-center h-full w-full min-w-4" slot="content">{value.title ?? ''}</div>
    </Button>
  </div>
{/if}
