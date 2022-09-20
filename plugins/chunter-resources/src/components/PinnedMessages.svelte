<script lang="ts">
  import { ChunterMessage } from '@hcengineering/chunter'
  import { Ref, Space } from '@hcengineering/core'
  import { eventToHTMLElement, Label, showPopup } from '@hcengineering/ui'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'
  import chunter from '../plugin'

  export let space: Ref<Space>
  export let pinnedIds: Ref<ChunterMessage>[]

  function showMessages (ev: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    showPopup(PinnedMessagesPopup, { space }, eventToHTMLElement(ev))
  }
</script>

{#if pinnedIds.length > 0}
  <div class="bottom-divider over-underline pt-2 pb-2 container">
    <div on:click={(ev) => showMessages(ev)}>
      <Label label={chunter.string.Pinned} />
      {pinnedIds.length}
    </div>
  </div>
{/if}

<style lang="scss">
  .container {
    padding-left: 2.5rem;
  }
</style>
