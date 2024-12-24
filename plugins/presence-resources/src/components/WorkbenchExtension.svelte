<script lang="ts">
  import { onDestroy, onMount } from 'svelte'

  import { type PresenceClient, connect } from '../client'

  let parentElement: HTMLDivElement
  let client: PresenceClient | undefined

  onMount(() => {
    client = connect()
  })

  onDestroy(() => {
    client?.close()
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
