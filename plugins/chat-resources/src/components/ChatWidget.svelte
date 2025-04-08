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
  import { MessagePresenter, MessageInput, Divider, UploadedFile } from '@hcengineering/ui-next'
  import core, { fillDefaults, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import { jsonToMarkup, markupToText } from '@hcengineering/text'
  import { markdownToMarkup } from '@hcengineering/text-markdown'
  import { makeRank } from '@hcengineering/rank'

  import { ChatWidgetData } from '../types'
  import chat from '../plugin'
  import ChatHeader from './ChatHeader.svelte'
  import ChatBody from './ChatBody.svelte'

  export let widget: Widget | undefined
  export let widgetState: WidgetState | undefined
  export let height: string
  export let width: string

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const communicationClient = getCommunicationClient()

  const messageQuery = createMessagesQuery()
  const threadCardQuery = createQuery()
  const parentCardQuery = createQuery()

  let data: ChatWidgetData | undefined = undefined

  let threadCard: Card | undefined = undefined
  let parentCard: Card | undefined = undefined
  let message: Message | undefined = undefined

  $: data = widgetState?.data as ChatWidgetData

  $: if (data?.card !== undefined && data?.message !== undefined) {
    messageQuery.query(
      {
        card: data.card,
        id: data.message,
        limit: 1,
        replies: true,
        files: true,
        reactions: true
      },
      (res) => {
        message = res.getResult()[0]
      }
    )

    parentCardQuery.query(
      cardPlugin.class.Card,
      { _id: data.card },
      (res) => {
        parentCard = res[0]
      },
      { limit: 1 }
    )
  } else {
    message = undefined
    parentCard = undefined
    messageQuery.unsubscribe()
    parentCardQuery.unsubscribe()
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

  async function handleSubmit (markdown: string, files: UploadedFile[]): Promise<void> {
    if (message === undefined || data === undefined) return
    const { card } = data
    if (card === undefined || parentCard === undefined) return

    let threadId: CardID | undefined = message.thread?.thread
    if (threadId == null) {
      const markup = jsonToMarkup(markdownToMarkup(message.content))
      const messageText = markupToText(markup).trim()

      const lastOne = await client.findOne(cardPlugin.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
      const titleFromMessage = `${messageText.slice(0, 100)}${messageText.length > 100 ? '...' : ''}`
      const title = titleFromMessage.length > 0 ? titleFromMessage : `Thread from ${parentCard.title}`
      const data = fillDefaults(
        hierarchy,
        {
          title,
          rank: makeRank(lastOne?.rank, undefined),
          content: '' as MarkupBlobRef,
          parent: parentCard._id
        },
        chat.masterTag.Thread
      )
      threadId = (await client.createDoc(chat.masterTag.Thread, core.space.Workspace, data)) as CardID

      await communicationClient.createThread(card, message.id, threadId)
    }

    if (threadId != null) {
      const id = await communicationClient.createMessage(threadId, markdown)
      for (const file of files) {
        await communicationClient.createFile(threadId, id, file.blobId, file.type, file.filename, file.size)
      }
    }
  }
</script>

{#if widget && data && data.message}
  <div class="chat-widget" style:width style:height>
    <ChatHeader card={threadCard} />
    {#if message && parentCard}
      <div style:padding="0 1rem">
        <MessagePresenter {message} card={parentCard} />
      </div>
      <Divider />

      <div class="messages">
        <ChatBody card={threadCard} bottomStart={false} showDates={false} />
      </div>
      <div style:padding="1rem">
        <MessageInput onSubmit={handleSubmit} />
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
