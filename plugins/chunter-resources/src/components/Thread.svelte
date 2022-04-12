<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import attachment from '@anticrm/attachment'
  import { AttachmentRefInput } from '@anticrm/attachment-resources'
  import type { Message,ThreadMessage } from '@anticrm/chunter'
  import contact,{ Employee } from '@anticrm/contact'
  import core,{ generateId,getCurrentAccount,Ref,TxFactory } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { createQuery,getClient } from '@anticrm/presentation'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'
  import ChannelSeparator from './ChannelSeparator.svelte'
  import MsgView from './Message.svelte'
  import ThreadComment from './ThreadComment.svelte'

  const client = getClient()
  const query = createQuery()
  const messageQuery = createQuery()

  export let _id: Ref<Message>
  let parent: Message | undefined
  let commentId = generateId() as Ref<ThreadMessage>

  const notificationClient = NotificationClientImpl.getClient()

  const lookup = {
    _id: { attachments: attachment.class.Attachment },
    createBy: core.class.Account
  }

  $: updateQueries(_id)

  function updateQueries (id: Ref<Message>) {
    messageQuery.query(
      chunter.class.Message,
      {
        _id: id
      },
      (res) => (parent = res[0]),
      {
        lookup: {
          _id: { attachments: attachment.class.Attachment },
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
        notificationClient.updateLastView(id, chunter.class.Message)
      },
      {
        lookup,
      }
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
      ))
  )

  async function onMessage (event: CustomEvent) {
    if (parent === undefined) return
    const { message, attachments } = event.detail
    const me = getCurrentAccount()._id
    const txFactory = new TxFactory(me)
    const tx = txFactory.createTxCreateDoc<ThreadMessage>(
      chunter.class.ThreadMessage,
      parent.space,
      {
        attachedTo: _id,
        attachedToClass: chunter.class.Message,
        collection: 'replies',
        content: message,
        createBy: me,
        createOn: 0,
        attachments
      },
      commentId
    )
    tx.attributes.createOn = tx.modifiedOn
    await notificationClient.updateLastView(_id, chunter.class.Message, tx.modifiedOn, true)
    await client.tx(tx)

    // Create an backlink to document
    await createBacklinks(client, parent.space, chunter.class.Channel, commentId, message)

    commentId = generateId()
  }
  let comments: ThreadMessage[] = []
</script>

<div class="header">
</div>
<div class="flex-col content">
  {#if parent}
    <MsgView message={parent} {employees} thread />
    {#if comments.length}
      <ChannelSeparator title={chunter.string.RepliesCount} line params={{ replies: comments.length }} />
    {/if}
    {#each comments as comment, i (comment._id)}
      <ThreadComment message={comment} {employees} />
    {/each}
  {/if}
</div>
<div class="ref-input">
  {#if parent}
    <AttachmentRefInput space={parent.space} _class={chunter.class.Comment} objectId={commentId} on:message={onMessage} />
  {/if}
</div>

<style lang="scss">
  .content {
    margin: 1rem 1rem 0px;
    padding: 1.5rem 1.5rem 0px;
  }
  .ref-input {
    margin: 1.25rem 2.5rem;
  }
</style>
