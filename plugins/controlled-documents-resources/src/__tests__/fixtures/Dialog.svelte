<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  export let canSubmit = false
  export let loading = false
  const dispatch = createEventDispatcher()
</script>

<div role="dialog" aria-busy={loading}>
  <slot />
  <slot name="footerExtra" />
  <button disabled={!canSubmit || loading} on:click={() => dispatch('submit')}>Submit</button>
  <button on:click={() => dispatch('close')}>Cancel</button>
</div>
