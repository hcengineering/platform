<script lang="ts">
  import { IconSearch, StatusBarButton, showPopup } from '@hcengineering/ui'
  import ActionsPopup from './ActionsPopup.svelte'

  function openPopup (): void {
    showPopup(ActionsPopup, {}, 'top')
  }
</script>

<StatusBarButton on:click={openPopup} icon={IconSearch} />
