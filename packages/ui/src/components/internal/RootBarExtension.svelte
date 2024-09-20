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

{#each $rootBarExtensions as ext (ext[1].id)}
  {#if ext[0] === position}
    <div id={ext[1].id} style:margin-right={'1px'}>
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
