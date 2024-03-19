<script lang="ts">
  import { location as locationStore } from '../../location'
  import { rootBarExtensions } from '../../utils'
  import Component from '../Component.svelte'

  export let position: 'left' | 'right'
  let oldLoc: string | undefined = undefined
  locationStore.subscribe((newLocation) => {
    if (oldLoc !== undefined && oldLoc !== newLocation.path[0]) {
      rootBarExtensions.set([])
    }
    oldLoc = newLocation.path[0]
  })
</script>

{#each $rootBarExtensions as ext}
  {#if ext[0] === position}
    <Component is={ext[1]} />
  {/if}
{/each}
