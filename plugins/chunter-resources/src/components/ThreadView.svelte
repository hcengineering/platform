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
  import type { ThreadMessage, Message, ChunterMessage } from '@hcengineering/chunter'
  import contact, { Employee } from '@hcengineering/contact'
  import core, { Doc, generateId, getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { IconClose, Label, getCurrentLocation, navigate } from '@hcengineering/ui'
  import { afterUpdate, beforeUpdate, createEventDispatcher } from 'svelte'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'
  import { messageIdForScroll, shouldScrollToMessage, isMessageHighlighted, scrollAndHighLight } from '../utils'
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
  const lastViews = notificationClient.getLastViews()

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
          const loc = getCurrentLocation()
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
        newMessagesPos = newMessagesStart(comments, $lastViews)
        notificationClient.updateLastView(id, chunter.class.Message)
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
      'replies',
      {
        content: message,
        createBy: me,
        createOn: Date.now(),
        attachments
      },
      commentId
    )

    // Create an backlink to document
    await createBacklinks(client, currentSpace, chunter.class.ChunterSpace, commentId, message)

    commentId = generateId()
    isScrollForced = true
    loading = false
  }
  let comments: ThreadMessage[] = []

  function newMessagesStart (comments: ThreadMessage[], lastViews: Map<Ref<Doc>, number>): number {
    const lastView = lastViews.get(_id)
    if (lastView === undefined || lastView === -1) return -1
    for (let index = 0; index < comments.length; index++) {
      const comment = comments[index]
      if (comment.createOn > lastView) return index
    }
    return -1
  }

  $: markUnread($lastViews)
  function markUnread (lastViews: Map<Ref<Doc>, number>) {
    const newPos = newMessagesStart(comments, lastViews)
    if (newPos !== -1 || newMessagesPos === -1) {
      newMessagesPos = newPos
    }
  }
  let newMessagesPos: number = -1
  let loading = false
</script>

<div class="header">
  <div class="title"><Label label={chunter.string.Thread} /></div>
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
    <MsgView {message} {employees} thread isSaved={savedMessagesIds.includes(message._id)} {savedAttachmentsIds} />
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
        {employees}
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
      color: var(--theme-caption-color);
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
