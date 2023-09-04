<script lang="ts">
  import attachment, { Attachment } from '@hcengineering/attachment'
  import chunter, { ChunterMessage } from '@hcengineering/chunter'
  import core, { DocumentQuery, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label, Scroller, SearchEdit } from '@hcengineering/ui'
  import { FilterBar } from '@hcengineering/view-resources'
  import plugin from '../plugin'
  import { openMessageFromSpecial } from '../utils'
  import MessageComponent from './Message.svelte'

  export let withHeader: boolean = true
  export let filterClass = chunter.class.ChunterMessage
  export let search: string = ''

  let searchQuery: DocumentQuery<ChunterMessage> = { $search: search }

  function updateSearchQuery (search: string): void {
    searchQuery = { $search: search }
  }

  $: updateSearchQuery(search)

  const client = getClient()
  let messages: ChunterMessage[] = []

  let resultQuery: DocumentQuery<ChunterMessage> = { ...searchQuery }

  async function updateMessages (resultQuery: DocumentQuery<ChunterMessage>) {
    messages = await client.findAll(
      filterClass,
      {
        ...resultQuery
      },
      {
        sort: { createdOn: SortingOrder.Descending },
        limit: 100,
        lookup: {
          _id: { attachments: attachment.class.Attachment },
          createBy: core.class.Account
        }
      }
    )
  }

  $: updateMessages(resultQuery)

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

{#if withHeader}
  <div class="ac-header full divide">
    <div class="ac-header__wrap-title">
      <span class="ac-header__title"><Label label={plugin.string.MessagesBrowser} /></span>
    </div>
    <SearchEdit
      value={search}
      on:change={() => {
        updateSearchQuery(search)
        updateMessages(resultQuery)
      }}
    />
  </div>
{/if}
<FilterBar _class={filterClass} space={undefined} query={searchQuery} on:change={(e) => (resultQuery = e.detail)} />
{#if messages.length > 0}
  <Scroller>
    {#each messages as message}
      <div on:click={() => openMessageFromSpecial(message)}>
        <MessageComponent
          {message}
          on:openThread
          isPinned={pinnedIds.includes(message._id)}
          isSaved={savedMessagesIds.includes(message._id)}
          {savedAttachmentsIds}
        />
      </div>
    {/each}
  </Scroller>
{:else}
  <div class="flex-center h-full text-lg">
    <Label label={plugin.string.NoResults} />
  </div>
{/if}
