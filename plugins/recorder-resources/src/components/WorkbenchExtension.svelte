<script lang="ts">
  import { pushRootBarComponent } from '@hcengineering/ui'
  import { onMount } from 'svelte'

  import recorder from '../plugin'
  import { AccountRole, getCurrentAccount } from '@hcengineering/core'

  let parentElement: HTMLDivElement

  const me = getCurrentAccount()

  onMount(() => {
    if (me.role === AccountRole.ReadOnlyGuest) return
    pushRootBarComponent('right', recorder.component.RecorderExt, 1300)
  })
</script>

<div bind:this={parentElement} class="hidden"></div>
