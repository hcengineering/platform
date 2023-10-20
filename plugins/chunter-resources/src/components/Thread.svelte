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
  import chunter, { type ChunterSpace, type Message, type ThreadMessage } from '@hcengineering/chunter'
  import contact, { Person, PersonAccount, getName } from '@hcengineering/contact'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import core, { FindOptions, IdMap, Ref, SortingOrder, generateId, getCurrentAccount } from '@hcengineering/core'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Label } from '@hcengineering/ui'
  import plugin from '../plugin'
  import ChannelPresenter from './ChannelPresenter.svelte'
  import DmPresenter from './DmPresenter.svelte'
  import MsgView from './Message.svelte'

  const client = getClient()
  const query = createQuery()
  const messageQuery = createQuery()
  const currentPerson = (getCurrentAccount() as PersonAccount)?.person
  const currentEmployee = currentPerson !== undefined ? $personByIdStore.get(currentPerson) : undefined

  export let savedAttachmentsIds: Ref<Attachment>[]
  export let _id: Ref<Message>
  export let showHeader = true
  export let readOnly = false

  let parent: Message | undefined
  let commentId = generateId() as Ref<ThreadMessage>

  const notificationClient = NotificationClientImpl.getClient()

  const lookup = {
    _id: { attachments: attachment.class.Attachment },
    createBy: core.class.Account
  }

  let showAll = false
  let total = 0

  let showActions = false
  let showSend = false

  $: updateQuery(_id)
  $: updateThreadQuery(_id, showAll)

  function updateQuery (id: Ref<Message>) {
    messageQuery.query(
      plugin.class.Message,
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
      plugin.class.ThreadMessage,
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
    await client.addCollection(
      chunter.class.ThreadMessage,
      parent.space,
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
    loading = false
  }
  let comments: ThreadMessage[] = []

  async function getChannel (_id: Ref<ChunterSpace>): Promise<ChunterSpace | undefined> {
    return await client.findOne(plugin.class.ChunterSpace, { _id })
  }
  let loading = false
</script>

{#if showHeader && parent}
  <div class="flex-col ml-4 mt-4 flex-no-shrink">
    {#await getChannel(parent.space) then channel}
      {#if channel?._class === plugin.class.Channel}
        <ChannelPresenter value={channel} />
      {:else if channel}
        <DmPresenter value={channel} />
      {/if}
    {/await}
    <div class="text-sm">
      {#await getParticipants(comments, parent, $personByIdStore) then participants}
        {participants.join(', ')}
        <Label label={plugin.string.AndYou} params={{ participants: participants.length }} />
      {/await}
    </div>
  </div>
{/if}
<div class="flex-col content mt-2 flex-no-shrink">
  {#if parent}
    <MsgView message={parent} thread {savedAttachmentsIds} {readOnly} />
    {#if total > comments.length}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <div
        class="label pb-2 pt-2 pl-8 over-underline clear-mins"
        on:click={() => {
          showAll = true
        }}
      >
        <Label label={plugin.string.ShowMoreReplies} params={{ count: total - comments.length }} />
      </div>
    {/if}
    {#each comments as comment (comment._id)}
      <MsgView message={comment} thread {savedAttachmentsIds} {readOnly} />
    {/each}
    {#if !readOnly}
      <div class="flex mr-4 ml-4 pb-4 mt-2 clear-mins">
        <div class="min-w-6">
          <Avatar size="x-small" avatar={currentEmployee?.avatar} name={currentEmployee?.name} />
        </div>
        <div class="ml-2 w-full">
          <AttachmentRefInput
            space={parent.space}
            _class={plugin.class.ThreadMessage}
            objectId={commentId}
            placeholder={chunter.string.AddCommentPlaceholder}
            {showActions}
            {showSend}
            on:message={onMessage}
            on:focus={() => {
              showSend = true
              showActions = true
            }}
            bind:loading
          />
        </div>
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .content {
    overflow: hidden;
  }

  .label:hover {
    background-color: var(--theme-button-hovered);
  }
</style>
