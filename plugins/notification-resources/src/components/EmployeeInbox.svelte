<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import activity, { TxViewlet } from '@hcengineering/activity'
  import { activityKey, ActivityKey } from '@hcengineering/activity-resources'
  import chunter, { createBacklinks, DirectMessage, Message } from '@hcengineering/chunter'
  import { Employee, getName, PersonAccount } from '@hcengineering/contact'
  import { Avatar, employeeByIdStore, personAccountByIdStore } from '@hcengineering/contact-resources'
  import core, { Account, Doc, generateId, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { Button, Loading, Scroller } from '@hcengineering/ui'

  import NotificationView from './NotificationView.svelte'
  import { AttachmentRefInput } from '@hcengineering/attachment-resources'
  import { getDirectChannel } from '../utils'

  export let accountId: Ref<Account>
  const dispatch = createEventDispatcher()

  const query = createQuery()

  let _id: Ref<Doc> | undefined
  let docs: DocUpdates[] = []
  let _docs: DocUpdates[] = []
  let loading = true
  const me = getCurrentAccount()._id

  $: query.query(
    notification.class.DocUpdates,
    {
      user: me,
      hidden: false
    },
    (res) => {
      docs = res
      updateDocs(docs, accountId, true)
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  $: updateDocs(docs, accountId)
  function updateDocs(docs: DocUpdates[], accountId: Ref<Account>, forceUpdate = false) {
    if (loading && !forceUpdate) {
      return
    }

    _docs = []
    for (const doc of docs) {
      if (doc.txes.length === 0) continue
      const txes = doc.txes.filter((p) => p.modifiedBy === accountId)
      if (txes.length > 0) {
        _docs.push({
          ...doc,
          txes
        })
      }
    }
    _docs = _docs
  }

  function markAsRead (index: number) {
    if (_docs[index] !== undefined) {
      _docs[index].txes.forEach((p) => (p.isNew = false))
      _docs[index].txes = _docs[index].txes
      _docs = _docs
    }
  }

  function changeSelected (index: number) {
    if (_docs[index] !== undefined) {
      _id = _docs[index]?.attachedTo
      dispatch('change', _docs[index])
      markAsRead(index)
    } else if (_docs.length) {
      if (index < _docs.length - 1) {
        selected++
      } else {
        selected--
      }
      changeSelected(selected)
    } else {
      selected = 0
      _id = undefined
      dispatch('change', undefined)
    }
  }

  let viewlets: Map<ActivityKey, TxViewlet>

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })

  let selected = 0

  let employee: Employee | undefined = undefined
  $: newTxes = _docs.reduce((acc, cur) => acc + cur.txes.filter((p) => p.isNew).length, 0) // items.length
  $: account = $personAccountByIdStore.get(accountId as Ref<PersonAccount>)
  $: employee = account ? $employeeByIdStore.get(account.person as Ref<Employee>) : undefined

  const client = getClient()

  async function openDM () {
    const res = await client.findAll(chunter.class.DirectMessage, { members: accountId })
    const current = res.find((p) => p.members.includes(me) && p.members.length === 2)
    if (current !== undefined) {
      dispatch('dm', current._id)
    } else {
      const id = await client.createDoc(chunter.class.DirectMessage, core.space.Space, {
        name: '',
        description: '',
        private: true,
        archived: false,
        members: [me, accountId]
      })
      dispatch('dm', id)
    }
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      selected--
      changeSelected(selected)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      selected++
      changeSelected(selected)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      changeSelected(selected)
    }
  }

  const _class = chunter.class.Message
  let messageId = generateId() as Ref<Message>

  let space: Ref<DirectMessage> | undefined

  $: _getDirectChannel(account?._id)
  async function _getDirectChannel(account?: Ref<PersonAccount>): Promise<void> {
    if (account === undefined) {
      return
    }

    space = await getDirectChannel(client, me as Ref<PersonAccount>, account)
  }

  async function onMessage (event: CustomEvent) {
    if (space === undefined) {
      return
    }

    const { message, attachments } = event.detail
    await client.addCollection(
      _class,
      space,
      space,
      chunter.class.DirectMessage,
      'messages',
      {
        content: message,
        createBy: me,
        attachments
      },
      messageId
    )

    await createBacklinks(client, space, chunter.class.ChunterSpace, _id, message)

    messageId = generateId()
    loading = false
  }
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="flex-between header bottom-divider">
  <div class="flex-row-center">
    {#if employee}
      <Avatar size="smaller" avatar={employee.avatar} />
      <span class="font-medium mx-2">{getName(client.getHierarchy(), employee)}</span>
    {/if}
    {#if newTxes > 0}
      <span class="counter">
        {newTxes}
      </span>
    {/if}
  </div>
  {#if me !== accountId}
    <Button label={chunter.string.Message} kind="accented" on:click={openDM} />
  {/if}
</div>
<div class="inbox-activity">
  <Scroller noStretch>
    {#if loading}
      <Loading />
    {:else}
      {#each _docs as item, i (item._id)}
        <div class="with-hover">
          <NotificationView
            value={item}
            selected={false}
            {viewlets}
            on:keydown={onKeydown}
            on:click={() => {
              selected = i
              changeSelected(selected)
            }}
            preview
          />
        </div>
      {/each}
    {/if}
  </Scroller>
</div>
{#if space !== undefined}
  <div class="reference">
    <AttachmentRefInput bind:loading {space} {_class} objectId={messageId} on:message={onMessage} />
  </div>
{/if}

<style lang="scss">
  .header {
    flex-shrink: 0;
    padding: 0.625rem 1.25rem 0.625rem 1.75rem;
    min-width: 0;
    min-height: 3.25rem;
    background-color: var(--theme-comp-header-color);
  }

  .counter {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.375rem;
    width: 1.375rem;
    color: var(--theme-inbox-people-notify);
    background-color: var(--theme-inbox-people-counter-bgcolor);
    border-radius: 50%;
  }

  .reference {
    margin: 1.25rem 2.5rem;
  }

  .with-hover {
    &:hover {
      background-color: var(--theme-inbox-activitymsg-bgcolor);
    }
  }
</style>
