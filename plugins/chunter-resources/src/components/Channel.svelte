<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { ChunterMessage, Message } from '@anticrm/chunter'
  import contact, { Employee } from '@anticrm/contact'
  import core, { Doc, Ref, Space, WithLookup } from '@anticrm/core'
  import { NotificationClientImpl } from '@anticrm/notification-resources'
  import { createQuery } from '@anticrm/presentation'
  import { afterUpdate, beforeUpdate } from 'svelte'
  import chunter from '../plugin'
  import ChannelSeparator from './ChannelSeparator.svelte'
  import MessageComponent from './Message.svelte'

  export let space: Ref<Space> | undefined
  export let pinnedIds: Ref<ChunterMessage>[]
  export let savedIds: Ref<ChunterMessage>[]

  let div: HTMLDivElement | undefined
  let autoscroll: boolean = false

  beforeUpdate(() => {
    autoscroll = div !== undefined && div.offsetHeight + div.scrollTop > div.scrollHeight - 20
  })

  afterUpdate(() => {
    if (div && autoscroll) div.scrollTo(0, div.scrollHeight)
  })

  let messages: WithLookup<Message>[] | undefined
  let employees: Map<Ref<Employee>, Employee> = new Map<Ref<Employee>, Employee>()
  const query = createQuery()
  const employeeQuery = createQuery()

  const notificationClient = NotificationClientImpl.getClient()
  const lastViews = notificationClient.getLastViews()

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

  $: updateQuery(space)

  function updateQuery (space: Ref<Space> | undefined) {
    if (space === undefined) {
      query.unsubscribe()
      messages = []
      return
    }
    query.query(
      chunter.class.Message,
      {
        space
      },
      (res) => {
        messages = res
        newMessagesPos = newMessagesStart(messages)
        notificationClient.updateLastView(space, chunter.class.ChunterSpace)
      },
      {
        lookup: {
          _id: { attachments: attachment.class.Attachment },
          createBy: core.class.Account
        }
      }
    )
  }

  function newMessagesStart (messages: Message[]): number {
    if (space === undefined) return -1
    const lastView = $lastViews.get(space)
    if (lastView === undefined || lastView === -1) return -1
    for (let index = 0; index < messages.length; index++) {
      const message = messages[index]
      if (message.createOn > lastView) return index
    }
    return -1
  }

  $: markUnread($lastViews)
  function markUnread (lastViews: Map<Ref<Doc>, number>) {
    if (messages === undefined) return
    const newPos = newMessagesStart(messages)
    if (newPos !== -1 || newMessagesPos === -1) {
      newMessagesPos = newPos
    }
  }

  let newMessagesPos: number = -1
</script>

<div class="flex-col vScroll" bind:this={div}>
  {#if messages}
    {#each messages as message, i (message._id)}
      {#if newMessagesPos === i}
        <ChannelSeparator title={chunter.string.New} line reverse isNew />
      {/if}
      <MessageComponent
        {message}
        {employees}
        on:openThread
        isPinned={pinnedIds.includes(message._id)}
        isSaved={savedIds.includes(message._id)}
      />
    {/each}
  {/if}
</div>
