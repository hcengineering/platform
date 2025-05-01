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
  import { UploadedFile } from '@hcengineering/ui-next'
  import { fillDefaults, MarkupBlobRef, Ref, SortingOrder } from '@hcengineering/core'
  import { makeRank } from '@hcengineering/rank'
  import { employeeByPersonIdStore } from '@hcengineering/contact-resources'
  import { getEmployeeBySocialId } from '@hcengineering/contact'

  import { ChatWidgetData } from '../types'
  import chat from '../plugin'
  import { createThreadTitle } from '../utils'

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

  $: if (data !== undefined) {
    messageQuery.query(
      {
        card: data.card,
        created: data.created,
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
      { _id: data.card as Ref<Card> },
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
      const author =
        $employeeByPersonIdStore.get(message.creator) ?? (await getEmployeeBySocialId(client, message.creator))
      const lastOne = await client.findOne(cardPlugin.class.Card, {}, { sort: { rank: SortingOrder.Descending } })
      const title = createThreadTitle(message, parentCard)
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
      threadId = (await client.createDoc(chat.masterTag.Thread, cardPlugin.space.Default, data)) as CardID

      await communicationClient.createThread(card, message.id, message.created, threadId)
      if (author?.active === true && author?.personUuid !== undefined) {
        await communicationClient.addCollaborators(threadId, chat.masterTag.Thread, [author.personUuid])
      }
    }

    if (threadId != null) {
      const { id, created } = await communicationClient.createMessage(threadId, chat.masterTag.Thread, markdown)
      for (const file of files) {
        await communicationClient.createFile(threadId, id, created, file.blobId, file.type, file.filename, file.size)
      }
    }
  }
</script>

<!--{#if widget && data && data.message}-->
<!--  <div class="chat-widget" style:width style:height>-->
<!--    <ChatHeader card={threadCard} icon={chat.icon.Thread} title={data.name} canClose on:close />-->
<!--    {#if message && parentCard}-->
<!--      <div class="mt-4" />-->
<!--      <MessagePresenter {message} card={parentCard} replies={false} />-->
<!--      <Divider />-->

<!--      <div class="messages">-->
<!--        <ChatBody-->
<!--          card={threadCard}-->
<!--          bottomStart={false}-->
<!--          showDates={false}-->
<!--          overlyColor="var(&#45;&#45;next-background-color)"-->
<!--          {footerHeight}-->
<!--        />-->
<!--      </div>-->
<!--      <ChatFooter card={threadCard} bind:height={footerHeight} onSubmit={handleSubmit} />-->
<!--    {/if}-->
<!--  </div>-->
<!--{/if}-->

<style lang="scss">
  .chat-widget {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 0;
    background: var(--next-background-color);
  }

  .messages {
    display: flex;
    flex-direction: column;
    width: 100%;
    overflow: hidden;
  }

  .footer {
    border-top: 1px solid var(--next-divider-color);
    padding: 1.25rem 1rem 0 1rem;
  }
</style>
