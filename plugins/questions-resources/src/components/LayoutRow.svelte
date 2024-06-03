<!--
  Copyright © 2024 Hardcore Engineering Inc.
-->

<script lang="ts">
  export let baseline = false

  export let showDrag = !!$$slots.drag
  export let showBullet = !!$$slots.bullet
  export let showCorrect = !!$$slots.correct
  export let showIcon = !!$$slots.icon
</script>

<div class="flex flex-gap-1 my-1 min-h-7" class:items-center={!baseline} class:items-baseline={baseline}>
  {#if $$slots.drag && showDrag}
    <div class="min-w-6 flex justify-center"><slot name="drag" /></div>
  {/if}

  {#if $$slots.bullet && showBullet}
    <div class="min-w-6 flex justify-center"><slot name="bullet" /></div>
  {/if}

  {#if $$slots.correct && showCorrect}
    <span class="buttons-divider" />
    <div class="min-w-6 flex justify-center"><slot name="correct" /></div>
  {/if}

  <div class="ml-1 flex-grow label"><slot name="label" /></div>

  {#if $$slots.icon && showIcon}
    <slot name="icon" />
  {/if}
</div>

<style lang="scss">
  .label {
    position: relative;
    overflow: hidden;
  }
</style>
