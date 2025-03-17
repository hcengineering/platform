<!--
// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.
-->
<script lang="ts">
  import { closeWidget, WidgetState } from '@hcengineering/workbench-resources'
  import { Widget } from '@hcengineering/workbench'
  import { getClient, createQuery, getCommunicationClient, createMessagesQuery } from '@hcengineering/presentation'
  import cardPlugin, { type Card } from '@hcengineering/card'
  import { Message, CardID } from '@hcengineering/communication-types'
  import { Message as MessagePresenter, MessageInput, Divider } from '@hcengineering/ui-next'
  import core, { fillDefaults, type Markup, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import { jsonToMarkup, markupToJSON, markupToText } from '@hcengineering/text'
  import { markupToMarkdown, markdownToMarkup } from '@hcengineering/text-markdown'
  import { makeRank } from '@hcengineering/rank'

  import { ChatWidgetData } from '../types'
  import chat from '../plugin'
  import ChatHeader from './ChatHeader.svelte'
  import ChatBody from './ChatBody.svelte'
  import { toDisplayMessage } from '../ui'

  export let widget: Widget | undefined
  export let widgetState: WidgetState | undefined
  export let height: string
  export let width: string

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const communicationClient = getCommunicationClient()

  const messageQuery = createMessagesQuery()
  const threadCardQuery = createQuery()

  let data: ChatWidgetData | undefined = undefined

  let threadCard: Card | undefined = undefined
  let message: Message | undefined = undefined

  $: data = widgetState?.data as ChatWidgetData

  $: if (data?.card !== undefined && data?.message !== undefined) {
    messageQuery.query({
      card: data.card,
      id: data.message,
      limit: 1,
      withReplies: true,
      withFiles: true,
      withReactions: true
    }, (res) => {
      message = res.getResult()[0]
    })
  } else {
    message = undefined
    messageQuery.unsubscribe()
  }

  $: if (message?.thread != null) {
    threadCardQuery.query(
      cardPlugin.class.Card,
      { _id: message.thread.thread as Ref<Card> },
      (res) => {
        threadCard = res[0]
      },
      { limit: 1 }
    )
  } else {
    threadCard = undefined
    threadCardQuery.unsubscribe()
  }

  $: if (widget === undefined || data === undefined) {
    closeWidget(chat.ids.ChatWidget)
  }

  async function handleSubmit (event: CustomEvent<Markup>): Promise<void> {
    if (message === undefined || data === undefined) return
    const { card } = data
    if (card === undefined) return

    let threadId: CardID | undefined = message.thread?.thread
    if (threadId == null) {
      const markup = jsonToMarkup(markdownToMarkup(message.content))
      const title = markupToText(markup).trim()

      const lastOne = await client.findOne(cardPlugin.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
      const data = fillDefaults(
        hierarchy,
        {
          title: `Thread: ${title.slice(0, 100)}${title.length > 100 ? '...' : ''}`,
          rank: makeRank(lastOne?.rank, undefined),
          content: '' as MarkupBlobRef,
          parentInfo: [],
          blobs: {}
        },
        chat.masterTag.Thread
      )

      threadId = (await client.createDoc(chat.masterTag.Thread, core.space.Workspace, data)) as CardID

      await communicationClient.createThread(card, message.id, threadId)
    }

    if (threadId != null) {
      const markdown = markupToMarkdown(markupToJSON(event.detail))
      await communicationClient.createMessage(threadId, markdown)
    }
  }
</script>

{#if widget && data && data.message}
  <div class="chat-widget" style:width style:height>
    <ChatHeader card={threadCard} />
    {#if message}
      {@const displayMessage = toDisplayMessage({ ...message, thread: undefined })}
      <div style:padding="0 1rem">
        <MessagePresenter message={displayMessage} />
      </div>
      <Divider />

      <div class="messages">
        <ChatBody card={threadCard} bottomStart={false} showDates={false} />
      </div>
      <div style:padding="1rem">
        <MessageInput on:submit={handleSubmit} />
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .chat-widget {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: var(--next-background-color);
    font-family: 'Inter Display', sans-serif;
  }

  .messages {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
  }
</style>
