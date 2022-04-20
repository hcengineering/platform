<script lang="ts">
  import { createQuery } from '@anticrm/presentation'
  import { ChunterMessage } from '@anticrm/chunter'
  import { Ref } from '@anticrm/core'
  import Message from './Message.svelte'
  import contact, { Employee } from '@anticrm/contact'
  import { getCurrentLocation, Label, navigate } from '@anticrm/ui'
  import Bookmark from './icons/Bookmark.svelte'
  import chunter from '../plugin'

  let savedIds: Ref<ChunterMessage>[] = []
  let savedMessages: ChunterMessage[] = []

  const messagesQuery = createQuery()
  const preferenceQuery = createQuery()

  preferenceQuery.query(chunter.class.SavedMessages, {}, (res) => {
    savedIds = res.map((r) => r.savedMessageId)
  })

  $: savedIds &&
    messagesQuery.query(chunter.class.ChunterMessage, { _id: { $in: savedIds } }, (res) => {
      savedMessages = res
    })

  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()
  const employeeQuery = createQuery()

  employeeQuery.query(
    contact.class.Employee,
    {},
    (res) =>
      (employees = new Map(
        res.map((r) => {
          return [r._id, r]
        })
      ))
  )

  const pinnedQuery = createQuery()
  const pinnedIds: Ref<ChunterMessage>[] = []

  pinnedQuery.query(
    chunter.class.Channel,
    {},
    (res) => {
      res.forEach((ch) => pinnedIds.concat(ch?.pinned ?? []))
    },
    { limit: 1 }
  )

  function openMessage (message: ChunterMessage) {
    const loc = getCurrentLocation()

    if (message.attachedToClass === chunter.class.Channel) {
      loc.path.length = 3
      loc.path[2] = message.attachedTo
    } else if (message.attachedToClass === chunter.class.Message) {
      loc.path.length = 4
      loc.path[2] = message.space
      loc.path[3] = message.attachedTo
    }
    navigate(loc)
  }
</script>

{#if savedMessages.length > 0}
  {#each savedMessages as message}
    <div on:click={() => openMessage(message)}>
      <Message
        {message}
        {employees}
        on:openThread
        thread
        isPinned={pinnedIds.includes(message._id)}
        isSaved={savedIds.includes(message._id)}
      />
    </div>
  {/each}
{:else}
  <div class="empty">
    <Bookmark size={'large'} />
    <div class="an-element__label header">
      <Label label={chunter.string.EmptySavedHeader} />
    </div>
    <span class="an-element__label">
      <Label label={chunter.string.EmptySavedText} />
    </span>
  </div>
{/if}

<style lang="scss">
  .empty {
    display: flex;
    align-self: center;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: inherit;
    width: 30rem;
  }

  .header {
    font-weight: 600;
    margin: 1rem;
  }
</style>
