<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  export let space: string | undefined = undefined
  const dispatch = createEventDispatcher()
  // Match SpaceSelector's change-event contract, including parent-driven resets.
  let oldSpace = space
  $: if (oldSpace !== space) {
    oldSpace = space
    dispatch('change', space)
  }
</script>

<!-- Synthetic options model reselection, not project discovery or authorization. -->
<select aria-label="Target project" bind:value={space}>
  <option value={undefined}>Select</option>
  <option value="target-a">A</option>
  <option value="target-b">B</option>
</select>
