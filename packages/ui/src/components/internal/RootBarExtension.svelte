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

  $: sorted = $rootBarExtensions.sort((a, b) => a[1].order - b[1].order)
</script>

{#each sorted as ext (ext[1].id)}
  {#if ext[0] === position}
    <div id={ext[1].id} class="clear-mins">
      <Component
        is={ext[1].component}
        props={ext[1].props}
        on:close={() => {
          rootBarExtensions.update((cur) => {
            return cur.filter((it) => it[1].id !== ext[1].id)
          })
        }}
      />
    </div>
  {/if}
{/each}
