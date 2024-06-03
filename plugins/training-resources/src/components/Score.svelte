<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Percentage } from '@hcengineering/questions'

  export let count: number
  export let total: number
  export let score: Percentage
</script>

<span class="no-word-wrap">
  {count}/{total}
  <span class="score fs-normal">({score}%)</span>
</span>

<style lang="scss">
  .score {
    opacity: 0.6;
  }
</style>
