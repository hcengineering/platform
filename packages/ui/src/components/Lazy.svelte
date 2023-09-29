<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  import { lazyObserver } from '../lazy'

  let visible = false
</script>

<div
  use:lazyObserver={(val) => {
    if (val) {
      visible = true
      dispatch('visible')
    }
  }}
>
  {#if visible}
    <slot />
  {:else}
    <!-- Zero-width space character -->
    {#if $$slots.loading}
      <slot name="loading" />
    {:else}
      &#8203;
    {/if}
  {/if}
</div>
