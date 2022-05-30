<script lang="ts">
  import attachment, { Attachment } from '@anticrm/attachment'
  import chunter, { ChunterMessage, Message } from '@anticrm/chunter'
  import contact, { Employee } from '@anticrm/contact'
  import core, { DocumentQuery, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Label, Scroller, SearchEdit } from '@anticrm/ui'
  import type { Filter } from '@anticrm/view'
  import { FilterBar, FilterButton } from '@anticrm/view-resources'
  import MessageComponent from './Message.svelte'
  import { openMessageFromSpecial } from '../utils'

  let userSearch: string
  let searchQuery: DocumentQuery<ChunterMessage>

  let filters: Filter[] = []

  function updateSearchQuery (search: string): void {
    searchQuery = search === '' ? {} : { $search: search }
  }

  const client = getClient()
  const _class = chunter.class.ChunterMessage
  let messages: ChunterMessage[] = []

  let resultQuery: DocumentQuery<Message> = {}

  async function updateMessages (resultQuery: DocumentQuery<Message>) {
    messages = await client.findAll(
      _class,
      {
        ...resultQuery
      },
      {
        sort: { createOn: SortingOrder.Descending },
        limit: 100,
        lookup: {
          _id: { attachments: attachment.class.Attachment },
          createBy: core.class.Account
        }
      }
    )
  }

  $: updateMessages(resultQuery)

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
      )),
    {
      lookup: { _id: { statuses: contact.class.Status } }
    }
  )

  const pinnedQuery = createQuery()
  const pinnedIds: Ref<ChunterMessage>[] = []

  pinnedQuery.query(
    chunter.class.Channel,
    {},
    (res) => {
      res.forEach((ch) => {
        if (ch.pinned) {
          pinnedIds.push(...ch.pinned)
        }
      })
    },
    {}
  )
  let savedMessagesIds: Ref<ChunterMessage>[] = []
  let savedAttachmentsIds: Ref<Attachment>[] = []

  const savedMessagesQuery = createQuery()
  const savedAttachmentsQuery = createQuery()

  savedMessagesQuery.query(chunter.class.SavedMessages, {}, (res) => {
    savedMessagesIds = res.map((r) => r.attachedTo)
  })

  savedAttachmentsQuery.query(attachment.class.SavedAttachments, {}, (res) => {
    savedAttachmentsIds = res.map((r) => r.attachedTo)
  })
</script>

<div class="ac-header full divide">
  <div class="ac-header__wrap-title">
    <span class="ac-header__title"><Label label={chunter.string.MessagesBrowser} /></span>
  </div>
  <div class="ml-4"><FilterButton {_class} bind:filters /></div>
  <SearchEdit
    bind:value={userSearch}
    on:change={() => {
      updateSearchQuery(userSearch)
      updateMessages(resultQuery)
    }}
  />
</div>
<FilterBar {_class} query={searchQuery} bind:filters on:change={(e) => (resultQuery = e.detail)} />
<Scroller>
  {#each messages as message}
    <div on:click={() => openMessageFromSpecial(message)}>
      <MessageComponent
        {message}
        {employees}
        on:openThread
        isPinned={pinnedIds.includes(message._id)}
        isSaved={savedMessagesIds.includes(message._id)}
        {savedAttachmentsIds}
      />
    </div>
  {/each}
</Scroller>
