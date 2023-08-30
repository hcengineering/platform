<!--
// Copyright © 2021 Anticrm Platform Contributors.
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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { type ChunterMessage, type Message, type ThreadMessage } from '@hcengineering/chunter'
  import core, { Doc, Ref, Space, generateId, getCurrentAccount } from '@hcengineering/core'
  import { DocUpdates } from '@hcengineering/notification'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { IconClose, Label, getCurrentResolvedLocation, navigate } from '@hcengineering/ui'
  import { afterUpdate, beforeUpdate, createEventDispatcher } from 'svelte'
  import chunter from '../plugin'
  import { isMessageHighlighted, messageIdForScroll, scrollAndHighLight, shouldScrollToMessage } from '../utils'
  import ChannelSeparator from './ChannelSeparator.svelte'
  import MsgView from './Message.svelte'

  const client = getClient()
  const query = createQuery()
  const messageQuery = createQuery()
  const dispatch = createEventDispatcher()

  export let _id: Ref<Message>
  export let currentSpace: Ref<Space>
  let message: Message | undefined
  let commentId = generateId() as Ref<ThreadMessage>

  let div: HTMLDivElement | undefined
  let autoscroll: boolean = false
  let isScrollForced = false

  beforeUpdate(() => {
    autoscroll = div !== undefined && div.offsetHeight + div.scrollTop > div.scrollHeight - 20
  })

  afterUpdate(() => {
    if ($shouldScrollToMessage && !$isMessageHighlighted) {
      scrollAndHighLight()

      return
    }
    if (div && (autoscroll || isScrollForced)) {
      div.scrollTo(0, div.scrollHeight)
      isScrollForced = false
    }
  })

  const notificationClient = NotificationClientImpl.getClient()
  const docUpdates = notificationClient.docUpdatesStore

  const lookup = {
    _id: { attachments: attachment.class.Attachment, reactions: chunter.class.Reaction },
    createBy: core.class.Account
  }

  const pinnedQuery = createQuery()
  let pinnedIds: Ref<ChunterMessage>[] = []

  $: updateQueries(_id)

  function updateQueries (id: Ref<Message>) {
    messageQuery.query(
      chunter.class.Message,
      {
        _id: id
      },
      (res) => {
        message = res[0]

        if (!message) {
          const loc = getCurrentResolvedLocation()
          loc.path.length = 4
          navigate(loc)
        }
      },
      {
        lookup: {
          _id: { attachments: attachment.class.Attachment, reactions: chunter.class.Reaction },
          createBy: core.class.Account
        }
      }
    )

    query.query(
      chunter.class.ThreadMessage,
      {
        attachedTo: id
      },
      (res) => {
        comments = res
        newMessagesPos = newMessagesStart(comments, $docUpdates)
        notificationClient.read(id)
      },
      {
        lookup
      }
    )

    pinnedQuery.query(
      chunter.class.ChunterSpace,
      { _id: currentSpace },
      (res) => {
        pinnedIds = res[0]?.pinned ?? []
      },
      { limit: 1 }
    )
  }

  const savedMessagesQuery = createQuery()
  let savedMessagesIds: Ref<ChunterMessage>[] = []

  savedMessagesQuery.query(chunter.class.SavedMessages, {}, (res) => {
    savedMessagesIds = res.map((r) => r.attachedTo)
  })

  const savedAttachmentsQuery = createQuery()
  let savedAttachmentsIds: Ref<Attachment>[] = []
  savedAttachmentsQuery.query(attachment.class.SavedAttachments, {}, (res) => {
    savedAttachmentsIds = res.map((r) => r.attachedTo)
  })

  async function onMessage (event: CustomEvent) {
    const { message, attachments } = event.detail
    const me = getCurrentAccount()._id
    await client.addCollection(
      chunter.class.ThreadMessage,
      currentSpace,
      _id,
      chunter.class.Message,
      'repliesCount',
      {
        content: message,
        createBy: me,
        attachments
      },
      commentId
    )

    commentId = generateId()
    isScrollForced = true
    loading = false
  }
  let comments: ThreadMessage[] = []

  function newMessagesStart (comments: ThreadMessage[], docUpdates: Map<Ref<Doc>, DocUpdates>): number {
    const docUpdate = docUpdates.get(_id)
    const lastView = docUpdate?.txes?.findLast((tx) => !tx.isNew)
    if (!docUpdate?.txes.some((tx) => tx.isNew)) return -1
    if (docUpdate === undefined || lastView === undefined) return -1
    for (let index = 0; index < comments.length; index++) {
      const comment = comments[index]
      if ((comment.createdOn ?? 0) >= lastView.modifiedOn) return index
    }
    return -1
  }

  $: markUnread(comments, $docUpdates)
  function markUnread (comments: ThreadMessage[], docUpdates: Map<Ref<Doc>, DocUpdates>) {
    const newPos = newMessagesStart(comments, docUpdates)
    if (newPos !== -1) {
      newMessagesPos = newPos
    }
  }

  let newMessagesPos: number = -1
  let loading = false
</script>

<div class="header">
  <div class="title"><Label label={chunter.string.Thread} /></div>
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div
    class="tool"
    on:click={() => {
      dispatch('close')
    }}
  >
    <IconClose size="medium" />
  </div>
</div>
<div class="flex-col vScroll content" bind:this={div}>
  {#if message}
    <MsgView {message} thread isSaved={savedMessagesIds.includes(message._id)} {savedAttachmentsIds} />
    {#if comments.length}
      <ChannelSeparator title={chunter.string.RepliesCount} line params={{ replies: comments.length }} />
    {/if}
    {#each comments as comment, i (comment._id)}
      {#if newMessagesPos === i}
        <ChannelSeparator title={chunter.string.New} line reverse isNew />
      {/if}
      <MsgView
        isHighlighted={$messageIdForScroll === comment._id && $isMessageHighlighted}
        message={comment}
        thread
        isPinned={pinnedIds.includes(comment._id)}
        isSaved={savedMessagesIds.includes(comment._id)}
        {savedAttachmentsIds}
      />
    {/each}
  {/if}
</div>
<div class="ref-input">
  <AttachmentRefInput
    space={currentSpace}
    _class={chunter.class.ThreadMessage}
    objectId={commentId}
    on:message={onMessage}
    bind:loading
  />
</div>

<style lang="scss">
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;

    .title {
      flex-grow: 1;
      font-weight: 500;
      font-size: 1.25rem;
      color: var(--caption-color);
      user-select: none;
    }
    .tool {
      margin-left: 0.75rem;
      opacity: 0.4;
      cursor: pointer;
      &:hover {
        opacity: 1;
      }
    }
  }
  .ref-input {
    margin: 1.25rem 2.5rem;
  }
</style>
