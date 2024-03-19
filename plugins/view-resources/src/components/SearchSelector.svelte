<script lang="ts">
  import { IconSearch } from '@hcengineering/ui'
  import { showPopup } from '@hcengineering/ui/src/popups'
  import ActionsPopup from './ActionsPopup.svelte'

  function openPopup () {
    showPopup(ActionsPopup, {}, 'top')
  }
</script>

<button
  class="antiButton ghost jf-center bs-none no-focus resetIconSize statusButton square"
  on:click={openPopup}
  style:color={'var(--theme-dark-color)'}
>
  <IconSearch size={'small'} />
</button>
