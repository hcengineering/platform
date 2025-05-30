<script lang="ts">
  import { pushRootBarComponent } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import recorder from '../plugin'

  let parentElement: HTMLDivElement

  onMount(() => {
    pushRootBarComponent('right', recorder.component.RecorderExt, 1300)
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
