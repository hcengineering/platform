<script lang="ts">
  import { ChunterMessage } from '@anticrm/chunter'
  import { Ref } from '@anticrm/core'
  import { showPopup } from '@anticrm/ui'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'
  import { UnpinMessage } from '../index'

  export let pinnedIds: Ref<ChunterMessage>[]

  function showMessages (ev: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    showPopup(PinnedMessagesPopup, { pinnedIds }, ev.target, (props) => {
      if (props) {
        UnpinMessage(props.message)
      }
    })
  }
</script>

{#if pinnedIds.length > 0}
  <div class="bottom-divider container">
    <div on:click={(ev) => showMessages(ev)}>
      {pinnedIds.length}
    </div>
  </div>
{/if}

<style lang="scss">
  .container {
    padding-left: 0.5rem;
  }
</style>
