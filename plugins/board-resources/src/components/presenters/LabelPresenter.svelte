<script lang="ts">
  import { Button, getPlatformColor } from '@anticrm/ui'
  import type { CardLabel } from '@anticrm/board'

  export let value: CardLabel
  export let size: 'large' | 'medium'

  const backgroundColor = getPlatformColor(value.color)

</script>

{#if value}
  <Button {size} on:click>
    <div style:background={backgroundColor} slot="content">{value.title}</div>
  </Button>
{/if}
