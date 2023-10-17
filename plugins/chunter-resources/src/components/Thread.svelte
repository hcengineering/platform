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
  import attachment, { Attachment } from '@hcengineering/attachment'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { type ChunterSpace, type Message, type ThreadMessage } from '@hcengineering/chunter'
  import contact, { Person, PersonAccount, getName } from '@hcengineering/contact'
  import { personByIdStore } from '@hcengineering/contact-resources'
  import core, { FindOptions, IdMap, Ref, SortingOrder, generateId, getCurrentAccount } from '@hcengineering/core'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import chunter from '../plugin'
  import ChannelPresenter from './ChannelPresenter.svelte'
  import DmPresenter from './DmPresenter.svelte'
  import MsgView from './Message.svelte'

  const client = getClient()
  const query = createQuery()
  const messageQuery = createQuery()

  export let savedAttachmentsIds: Ref<Attachment>[]
  export let _id: Ref<Message>
  let parent: Message | undefined
  let commentId = generateId() as Ref<ThreadMessage>

  const notificationClient = NotificationClientImpl.getClient()

  const lookup = {
    _id: { attachments: attachment.class.Attachment },
    createBy: core.class.Account
  }

  let showAll = false
  let total = 0

  $: updateQuery(_id)
  $: updateThreadQuery(_id, showAll)

  function updateQuery (id: Ref<Message>) {
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
  }

  function updateThreadQuery (id: Ref<Message>, showAll: boolean) {
    const options: FindOptions<ThreadMessage> = {
      lookup,
      sort: {
        createdOn: SortingOrder.Descending
      },
      total: true
    }
    if (!showAll) {
      options.limit = 4
    }
    query.query(
      chunter.class.ThreadMessage,
      {
        attachedTo: id
      },
      (res) => {
        total = res.total
        if (!showAll && res.total > 4) {
          comments = res.splice(0, 2).reverse()
        } else {
          comments = res.reverse()
        }
        notificationClient.read(id)
      },
      options
    )
  }

  async function getParticipants (
    comments: ThreadMessage[],
    parent: Message | undefined,
    employees: IdMap<Person>
  ): Promise<string[]> {
    const refs = new Set(comments.map((p) => p.createBy))
    if (parent !== undefined) {
      refs.add(parent.createBy)
    }
    refs.delete(getCurrentAccount()._id)
    const accounts = await client.findAll(contact.class.PersonAccount, {
      _id: { $in: Array.from(refs) as Ref<PersonAccount>[] }
    })
    const res: string[] = []
    for (const account of accounts) {
      const employee = employees.get(account.person)
      if (employee !== undefined) {
        res.push(getName(client.getHierarchy(), employee))
      }
    }
    return res
  }

  async function onMessage (event: CustomEvent) {
    if (parent === undefined) return
    const { message, attachments } = event.detail
    const me = getCurrentAccount()._id
    await client.createDoc(
      chunter.class.ThreadMessage,
      parent.space,
      {
        attachedTo: _id,
        attachedToClass: chunter.class.Message,
        collection: 'repliesCount',
        content: message,
        createBy: me,
        attachments
      },
      commentId
    )

    commentId = generateId()
    loading = false
  }
  let comments: ThreadMessage[] = []

  async function getChannel (_id: Ref<ChunterSpace>): Promise<ChunterSpace | undefined> {
    return await client.findOne(chunter.class.ChunterSpace, { _id })
  }
  let loading = false
</script>

<div class="flex-col ml-8 mt-4 flex-no-shrink">
  {#if parent}
    {#await getChannel(parent.space) then channel}
      {#if channel?._class === chunter.class.Channel}
        <ChannelPresenter value={channel} />
      {:else if channel}
        <DmPresenter value={channel} />
      {/if}
    {/await}
    {#await getParticipants(comments, parent, $personByIdStore) then participants}
      {participants.join(', ')}
      <Label label={chunter.string.AndYou} params={{ participants: participants.length }} />
    {/await}
  {/if}
</div>
<div class="flex-col content flex-no-shrink">
  {#if parent}
    <MsgView message={parent} thread {savedAttachmentsIds} />
    {#if total > comments.length}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="label pb-2 pt-2 pl-8 over-underline clear-mins"
        on:click={() => {
          showAll = true
        }}
      >
        <Label label={chunter.string.ShowMoreReplies} params={{ count: total - comments.length }} />
      </div>
    {/if}
    {#each comments as comment (comment._id)}
      <MsgView message={comment} thread {savedAttachmentsIds} />
    {/each}
    <div class="mr-4 ml-4 pb-4 mt-2 clear-mins">
      <AttachmentRefInput
        space={parent.space}
        _class={chunter.class.ThreadMessage}
        objectId={commentId}
        on:message={onMessage}
        bind:loading
      />
    </div>
  {/if}
</div>
<div class="min-h-4 max-h-4 h-4 flex-no-shrink" />

<style lang="scss">
  .content {
    overflow: hidden;
    margin: 1rem 1rem 0;
    padding-top: 0.5rem;
    background-color: var(--theme-list-row-color);
    border: 1px solid var(--theme-divider-color);
    border-radius: 0.75rem;
  }

  .label:hover {
    background-color: var(--theme-button-hovered);
  }
</style>
