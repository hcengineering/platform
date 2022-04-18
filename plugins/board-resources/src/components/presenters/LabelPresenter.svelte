<script lang="ts">
  import type { CardLabel } from '@anticrm/board'
import ColorPresenter from './ColorPresenter.svelte'

  export let value: CardLabel
  export let size: 'small' | 'medium' | 'large' = 'medium'

</script>

{#if value}
  <ColorPresenter value={value.color} {size} on:click>
    <div class="flex-center h-full w-full fs-title text-sm pr-1 pl-1">{value.title ?? ''}</div>
  </ColorPresenter>
{/if}
