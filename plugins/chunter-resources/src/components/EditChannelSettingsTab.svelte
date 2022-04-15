<script lang="ts">
  import { Channel } from '@anticrm/chunter'
  import { Button } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte';
  import { ArchiveChannel } from '../index'
  import chunter from '../plugin'

  export let channel: Channel

  const dispatch = createEventDispatcher()
</script>

{#if channel}
  <div class="flex-col flex-gap-3">
    <Button
      label={chunter.string.ArchiveChannel}
      justify={'left'}
      on:click={() => {
        ArchiveChannel(channel, () => dispatch('close'))
      }}
    />
  </div>
{/if}
