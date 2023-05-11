<script lang="ts">
  import { TagReference } from '@hcengineering/tags'
  import ColorPresenter from './ColorPresenter.svelte'

  export let value: TagReference
  export let isHovered: boolean = false
  export let size: 'tiny' | 'x-small' | 'small' | 'medium' | 'large' = 'medium'
</script>

{#if value}
  <ColorPresenter value={value.color} {isHovered} {size} on:click>
    {#if size !== 'tiny'}
      <div class="flex-center h-full w-full text-sm pr-1 pl-1">{value.title}</div>
    {/if}
  </ColorPresenter>
{/if}
