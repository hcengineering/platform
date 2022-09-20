<script lang="ts">
  import { Channel } from '@hcengineering/chunter'
  import { Button } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ArchiveChannel } from '../index'
  import chunter from '../plugin'

  export let channel: Channel

  const dispatch = createEventDispatcher()
</script>

{#if channel}
  <Button
    label={chunter.string.ArchiveChannel}
    justify={'left'}
    size={'x-large'}
    on:click={(evt) => {
      ArchiveChannel(channel, evt, () => dispatch('close'))
    }}
  />
{/if}
