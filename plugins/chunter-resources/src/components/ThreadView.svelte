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
  import contact,{ Employee, EmployeeAccount } from '@anticrm/contact'
  import { Class,generateId,getCurrentAccount,Lookup,Ref, Space } from '@anticrm/core'
  import { createQuery,getClient } from '@anticrm/presentation'
  import { IconClose,Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
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

  const lookup = {
    _id: { attachments: attachment.class.Attachment }
  }

  $: updateQueries(_id)

  function updateQueries (id: Ref<Message>) {
    messageQuery.query(chunter.class.Message, {
      _id: id
    }, (res) => message = res[0], {
      lookup
    })

    query.query(chunter.class.Comment, {
      attachedTo: id
    }, (res) => comments = res, {
      lookup
    })
  }

  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()
  const employeeQuery = createQuery()

  employeeQuery.query(contact.class.Employee, { }, (res) => employees = new Map(res.map((r) => { return [r._id, r] })))

  async function onMessage (event: CustomEvent) {
    const { message, attachments } = event.detail
    const employee = (getCurrentAccount() as EmployeeAccount).employee
    await client.createDoc(chunter.class.Comment, space, {
      attachedTo: _id,
      attachedToClass: chunter.class.Message,
      collection: 'replies',
      message,
      attachments
    }, commentId)

    await client.updateDoc(chunter.class.Message, space, _id, {
      $push: { replies: employee },
      lastReply: new Date().getTime()
    })

    // Create an backlink to document
    await createBacklinks(client, space, chunter.class.Channel, commentId, message)
    commentId = generateId()
  }
  let comments: Comment[] = []
</script>

<div class="header">
  <div class="title"><Label label={chunter.string.Thread} /></div>
  <div class="tool" on:click={() => { dispatch('close') }}><IconClose size='medium' /></div>
</div>
<div class="h-full flex-col">
  <div class="content">
    {#if message}
      <div class="flex-col">
        <MsgView {message} {employees} thread />
        {#if comments.length}
          <ChannelSeparator title={chunter.string.RepliesCount} line params={{ replies: message.replies?.length }} />
        {/if}
        {#each comments as comment}
          <ThreadComment {comment} {employees} />
        {/each}
      </div>
    {/if}
  </div>
  <div class="ref-input">
    <AttachmentRefInput {space} _class={chunter.class.Comment} objectId={commentId} on:message={onMessage}/>
  </div>
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
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    margin: 1rem 1rem 0px;
    padding: 1.5rem 1.5rem 0px;
  }
  .ref-input {
    margin: 1.25rem 2.5rem;
  }
</style>
