<script lang="ts">
    import type { CardDate } from '@anticrm/board'
  
    export let value: CardDate
  
  </script>
  
  {#if value}
    <div on:click/>
  {/if}