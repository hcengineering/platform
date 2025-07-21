<script lang="ts">
  import { getMetadata } from '@hcengineering/platform'
  import { pushRootBarComponent } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import recorder from '../plugin'

  let parentElement: HTMLDivElement

  onMount(() => {
    const endpoint = getMetadata(recorder.metadata.StreamUrl) ?? ''
    if (endpoint !== '') {
      pushRootBarComponent('right', recorder.component.RecorderExt, 1300)
    }
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
