<script lang="ts">
  import { themeStore } from '@hcengineering/theme'
  import { updateEmojis } from '../utils'
  let parentElement: HTMLDivElement

  $: void updateEmojis($themeStore.language)
</script>

<div bind:this={parentElement} class="hidden"></div>
