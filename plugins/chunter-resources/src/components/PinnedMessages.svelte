<script lang="ts">
  import { ChunterMessage } from '@anticrm/chunter'
  import { createQuery } from '@anticrm/presentation'
  import contact, { EmployeeAccount } from '@anticrm/contact'
  import { Ref, Space } from '@anticrm/core'
  import { showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte';
  import chunter from '../plugin'
  import PinnedMessagesPopup from './PinnedMessagesPopup.svelte'

  export let space: Ref<Space>

  let messages: ChunterMessage[] = []
  let pinnedMessages: ChunterMessage[] = []

  const messagesQuery = createQuery()

  messagesQuery.query(chunter.class.ChunterMessage, {}, (res) => {
    messages = res
  })

  const pinnedQuery = createQuery()

  pinnedQuery.query(chunter.class.Channel, {}, (res) => {
    const channel = res.find((c) => c._id === space)
    const pinnedIds = channel?.pinned ?? []
    pinnedMessages = messages.filter((m) => pinnedIds.includes(m._id))
  })

  const employeeAccoutsQuery = createQuery()
  let employeeAcounts: EmployeeAccount[]

  employeeAccoutsQuery.query(contact.class.EmployeeAccount, {}, (res) => (employeeAcounts = res))

  const dispatch = createEventDispatcher()

  function showMessages (ev: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    showPopup(PinnedMessagesPopup, { pinnedMessages, employeeAcounts }, ev.target, (props) => {
      if (props) {
        dispatch('pinMessage', { messageId: props.message._id, channelId: space })
      }
    })
  }
</script>

{#if pinnedMessages.length > 0}
  <div class="container">
    <div on:click={(ev) => showMessages(ev)}>
      {pinnedMessages.length}
    </div>
  </div>
{/if}

<style lang="scss">
  .container {
    padding-left: 0.5rem;
    border-bottom: 1px solid var(--divider-color);
  }
</style>
