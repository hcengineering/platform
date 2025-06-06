<script lang="ts">
  import { pushRootBarComponent } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import uploader from '../plugin'

  let parentElement: HTMLDivElement

  onMount(() => {
    pushRootBarComponent('right', uploader.component.FileUploadExt, 10)
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
