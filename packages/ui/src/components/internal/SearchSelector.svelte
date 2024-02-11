<script lang="ts">
  import Search from './icons/Search.svelte'
  import { showPopup } from '../../popups'
  import { getMetadata } from '@hcengineering/platform'
  import uiPlugin from '../../plugin'
  import { location as locationStore } from '../../location'
  const popup = getMetadata(uiPlugin.metadata.SearchPopup)
  let isLoggedIn = false
  locationStore.subscribe((newLocation) => {
    isLoggedIn = newLocation.path[0] === 'workbench'
  })
  function openPopup () {
    if (popup !== undefined) showPopup(popup, {}, 'top')
  }
</script>

{#if isLoggedIn}
  <button
    class="antiButton ghost jf-center bs-none no-focus resetIconSize statusButton square"
    on:click={openPopup}
    style:color={'var(--theme-dark-color)'}
  >
    <Search size="32" />
  </button>
{/if}
