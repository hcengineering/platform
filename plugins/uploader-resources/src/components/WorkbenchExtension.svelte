<script lang="ts">
  import { rootBarExtensions } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import uploader from '../plugin'

  let parentElement: HTMLDivElement

  onMount(() => {
    rootBarExtensions.update((cur) => {
      if (cur.find((p) => p[1] === uploader.component.FileUploadExt) === undefined) {
        cur.push(['right', uploader.component.FileUploadExt])
      }
      return cur
    })
  })
</script>

<div bind:this={parentElement}></div>
