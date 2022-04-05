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
  import attachment from '@anticrm/attachment'
  import { AttachmentRefInput } from '@anticrm/attachment-resources'
  import type { Comment,Message } from '@anticrm/chunter'
  import contact,{ Employee,EmployeeAccount } from '@anticrm/contact'
  import core,{ generateId,getCurrentAccount,Ref,Space,TxFactory } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { createQuery,getClient } from '@anticrm/presentation'
  import { IconClose,Label } from '@anticrm/ui'
  import { afterUpdate,beforeUpdate,createEventDispatcher } from 'svelte'
  import { createBacklinks } from '../backlinks'
  import chunter from '../plugin'
  import ChannelSeparator from './ChannelSeparator.svelte'
  import MsgView from './Message.svelte'
  import ThreadComment from './ThreadComment.svelte'

  const client = getClient()
  const query = createQuery()
  const messageQuery = createQuery()
  const dispatch = createEventDispatcher()

  export let _id: Ref<Message>
  export let space: Ref<Space>
  let message: Message | undefined
  let commentId = generateId()

  let div: HTMLDivElement | undefined
	let autoscroll: boolean = false

	beforeUpdate(() => {
		autoscroll = div !== undefined && (div.offsetHeight + div.scrollTop) > (div.scrollHeight - 20)
	})

	afterUpdate(() => {
		if (div && autoscroll) div.scrollTo(0, div.scrollHeight)
	})

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()

  const lookup = {
    _id: { attachments: attachment.class.Attachment },
    modifiedBy: core.class.Account
  }

  $: updateQueries(_id)

  function updateQueries (id: Ref<Message>) {
    messageQuery.query(chunter.class.Message, {
      _id: id
    }, (res) => message = res[0], {
      lookup: {
        _id: { attachments: attachment.class.Attachment },
        createBy: core.class.Account
      }
    })

    query.query(chunter.class.Comment, {
      attachedTo: id
    }, (res) => {
      comments = res
      newMessagesPos = newMessagesStart(comments)
      notificationClient.updateLastView(id, chunter.class.Message)
    }, {
      lookup
    })
  }

  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()
  const employeeQuery = createQuery()

  employeeQuery.query(contact.class.Employee, { }, (res) => employees = new Map(res.map((r) => { return [r._id, r] })))

  async function onMessage (event: CustomEvent) {
    const { message, attachments } = event.detail
    const me = getCurrentAccount()._id
    const txFactory = new TxFactory(me)
    const tx = txFactory.createTxCreateDoc(chunter.class.Comment, space, {
      attachedTo: _id,
      attachedToClass: chunter.class.Message,
      collection: 'replies',
      message,
      attachments
    }, commentId)

    await notificationClient.updateLastView(_id, chunter.class.Message, tx.modifiedOn, true)
    await client.tx(tx)

    // Create an backlink to document
    await createBacklinks(client, space, chunter.class.Channel, commentId, message)

    commentId = generateId()
  }
  let comments: Comment[] = []

  function newMessagesStart (comments: Comment[]): number {
    const lastView = $lastViews.get(_id)
    if (lastView === undefined) return -1
    for (let index = 0; index < comments.length; index++) {
      const comment = comments[index]
      if (comment.modifiedOn > lastView) return index
    }
    return -1
  }

  let newMessagesPos: number = -1
</script>

<div class="header">
  <div class="title"><Label label={chunter.string.Thread} /></div>
  <div class="tool" on:click={() => { dispatch('close') }}><IconClose size='medium' /></div>
</div>
<div class="flex-col vScroll content" bind:this={div}>
  {#if message}
    <MsgView {message} {employees} thread />
    {#if comments.length}
      <ChannelSeparator title={chunter.string.RepliesCount} line params={{ replies: comments.length }} />
    {/if}
    {#each comments as comment, i (comment._id)}
      {#if newMessagesPos === i}
        <ChannelSeparator title={chunter.string.New} line reverse isNew />
      {/if}
      <ThreadComment {comment} {employees} />
    {/each}
  {/if}
</div>
<div class="ref-input">
  <AttachmentRefInput {space} _class={chunter.class.Comment} objectId={commentId} on:message={onMessage}/>
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
  .content {
    margin: 1rem 1rem 0px;
    padding: 1.5rem 1.5rem 0px;
  }
  .ref-input {
    margin: 1.25rem 2.5rem;
  }
</style>
