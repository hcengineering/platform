<script lang="ts">
  import { Channel } from '@anticrm/chunter'
  import { Button } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { ArchiveChannel } from '../index'
  import chunter from '../plugin'

  export let channel: Channel

  const dispatch = createEventDispatcher()
</script>

{#if channel}
  <div class="mt-4 ml-8 mr-8 flex-col p-4">
    <Button
      label={chunter.string.ArchiveChannel}
      justify={'left'}
      size={'x-large'}
      on:click={() => {
        ArchiveChannel(channel, () => dispatch('close'))
      }}
    />
  </div>
{/if}
