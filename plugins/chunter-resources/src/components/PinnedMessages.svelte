<script lang="ts">
  import { ChunterMessage } from '@anticrm/chunter'
  import { createQuery } from '@anticrm/presentation'
  import { Ref, Space } from '@anticrm/core'
  import { showPopup } from '@anticrm/ui'
  import chunter from '../plugin'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'
  import { UnpinMessage } from '../index'

  export let space: Ref<Space>

  let pinnedIds: Ref<ChunterMessage>[] = []
  const pinnedQuery = createQuery()

  pinnedQuery.query(
    chunter.class.Channel,
    { _id: space },
    (res) => {
      pinnedIds = res[0]?.pinned ?? []
    },
    { limit: 1 }
  )

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
