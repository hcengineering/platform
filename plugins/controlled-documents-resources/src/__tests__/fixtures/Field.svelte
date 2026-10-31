<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  export let value = ''
  export let label = ''
  export let disabled = false
  const dispatch = createEventDispatcher()
</script>

<label>
  {label}
  <input {disabled} bind:value on:input={() => dispatch('value', value)} />
</label>
