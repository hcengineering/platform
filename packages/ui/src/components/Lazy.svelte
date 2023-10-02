<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()

  import { lazyObserver, isLazyDisabled } from '../lazy'

  let visible = isLazyDisabled()
</script>

{#if !visible}
  <div
    use:lazyObserver={(val, unsubscribe) => {
      if (val) {
        visible = true
        dispatch('visible')
        unsubscribe?.()
      }
    }}
  >
    <!-- Zero-width space character -->
    {#if $$slots.loading}
      <slot name="loading" />
    {:else}
      &#8203;
    {/if}
  </div>
{:else}
  <slot />
{/if}
