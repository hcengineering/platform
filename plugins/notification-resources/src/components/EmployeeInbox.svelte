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
  import chunter from '@hcengineering/chunter'
  import { Employee, getName, PersonAccount } from '@hcengineering/contact'
  import { Avatar, employeeByIdStore, personAccountByIdStore } from '@hcengineering/contact-resources'
  import core, { Account, Class, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, Button, Loading, Scroller } from '@hcengineering/ui'

  import NotificationView from './NotificationView.svelte'
  import { getResource } from '@hcengineering/platform'

  export let accountId: Ref<Account>
  const dispatch = createEventDispatcher()

  const query = createQuery()

  let _id: Ref<Doc> | undefined
  let docs: DocUpdates[] = []
  let filteredDocs: DocUpdates[] = []
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
      updateDocs(accountId, true)
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  $: updateDocs(accountId)
  function updateDocs (accountId: Ref<Account>, forceUpdate = false) {
    if (loading && !forceUpdate) {
      return
    }

    const filtered: DocUpdates[] = []

    for (const doc of docs) {
      if (doc.txes.length === 0) continue
      const txes = doc.txes.filter((p) => p.modifiedBy === accountId)
      if (txes.length > 0) {
        filtered.push({
          ...doc,
          txes
        })
      }
    }

    filteredDocs = filtered
  }

  function markAsRead (index: number) {
    if (filteredDocs[index] !== undefined) {
      filteredDocs[index].txes.forEach((p) => (p.isNew = false))
      filteredDocs[index].txes = filteredDocs[index].txes
      filteredDocs = filteredDocs
    }
  }

  function changeSelected (index: number) {
    if (filteredDocs[index] !== undefined) {
      _id = filteredDocs[index]?.attachedTo
      dispatch('change', filteredDocs[index])
      markAsRead(index)
    } else if (filteredDocs.length) {
      if (index < filteredDocs.length - 1) {
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

  let viewlets: Map<ActivityKey, TxViewlet[]>

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map()
    for (const res of result) {
      const key = activityKey(res.objectClass, res.txClass)
      const arr = viewlets.get(key) ?? []
      arr.push(res)
      viewlets.set(key, arr)
    }
    viewlets = viewlets
  })

  let selected = 0

  let employee: Employee | undefined = undefined
  $: newTxes = filteredDocs.reduce((acc, cur) => acc + cur.txes.filter((p) => p.isNew).length, 0) // items.length
  $: account = $personAccountByIdStore.get(accountId as Ref<PersonAccount>)
  $: employee = account ? $employeeByIdStore.get(account.person as Ref<Employee>) : undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

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

  let dmInput: AnySvelteComponent | undefined = undefined
  $: dmInputRes = hierarchy.classHierarchyMixin(
    chunter.class.DirectMessage as Ref<Class<Doc>>,
    chunter.mixin.DirectMessageInput
  )?.component
  $: if (dmInputRes) {
    getResource(dmInputRes).then((res) => (dmInput = res))
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
      <Avatar size={'smaller'} avatar={employee.avatar} name={employee.name} />
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
      {#each filteredDocs as item, i (item._id)}
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
{#if dmInput && account}
  <svelte:component this={dmInput} {account} bind:loading />
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

  .with-hover {
    &:hover {
      background-color: var(--theme-inbox-activitymsg-bgcolor);
    }
  }
</style>
