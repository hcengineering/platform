<!--
  Copyright @ 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  import type { Training } from '@hcengineering/training'
  import TrainingPresenter from './TrainingPresenter.svelte'

  export let training: Training
</script>

<div class="flex-row-center no-word-wrap">
  <div class="flex-row-center flex-gap-1-5">
    <TrainingPresenter value={training} disabled accent />

    {#if $$slots.extra}
      <span>•</span>
      <slot name="extra" />
    {/if}

    {#if $$slots.state}
      <span>•</span>
      <slot name="state" />
    {/if}
  </div>
</div>
