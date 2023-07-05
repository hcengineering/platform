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
  import activity, { TxViewlet } from '@hcengineering/activity'
  import { activityKey, ActivityKey } from '@hcengineering/activity-resources'
  import chunter from '@hcengineering/chunter'
  import { Employee, EmployeeAccount, getName } from '@hcengineering/contact'
  import { Avatar, employeeAccountByIdStore, employeeByIdStore } from '@hcengineering/contact-resources'
  import core, { Account, Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import { ActionIcon, Button, IconBack, Loading, Scroller } from '@hcengineering/ui'
  import { ListSelectionProvider, SelectDirection } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import NotificationView from './NotificationView.svelte'

  export let accountId: Ref<Account>
  const dispatch = createEventDispatcher()

  const query = createQuery()

  let _id: Ref<Doc> | undefined
  let docs: DocUpdates[] = []
  let loading = true
  const me = getCurrentAccount()._id

  $: query.query(
    notification.class.DocUpdates,
    {
      user: me,
      hidden: false
    },
    (res) => {
      docs = []
      for (const doc of res) {
        if (doc.txes.length === 0) continue
        const txes = doc.txes.filter((p) => p.modifiedBy === accountId)
        if (txes.length > 0) {
          docs.push({
            ...doc,
            txes
          })
        }
      }
      docs = docs
      listProvider.update(docs)
      if (loading || _id === undefined) {
        changeSelected(selected)
      } else {
        const index = docs.findIndex((p) => p.attachedTo === _id)
        if (index === -1) {
          changeSelected(selected)
        } else {
          selected = index
          markAsRead(selected)
        }
      }
      loading = false
    },
    {
      sort: {
        lastTxTime: -1
      }
    }
  )

  function markAsRead (index: number) {
    if (docs[index] !== undefined) {
      docs[index].txes.forEach((p) => (p.isNew = false))
      docs[index].txes = docs[index].txes
      docs = docs
    }
  }

  function changeSelected (index: number) {
    if (docs[index] !== undefined) {
      listProvider.updateFocus(docs[index])
      _id = docs[index]?.attachedTo
      dispatch('change', docs[index])
      markAsRead(index)
    } else if (docs.length) {
      if (index < docs.length - 1) {
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

  const listProvider = new ListSelectionProvider((offset: 1 | -1 | 0, of?: Doc, dir?: SelectDirection) => {
    if (dir === 'vertical') {
      const value = selected + offset
      if (docs[value] !== undefined) {
        selected = value
        changeSelected(selected)
      }
    }
  })

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })

  let selected = 0

  let employee: Employee | undefined = undefined
  $: newTxes = docs.reduce((acc, cur) => acc + cur.txes.filter((p) => p.isNew).length, 0) // items.length
  $: account = $employeeAccountByIdStore.get(accountId as Ref<EmployeeAccount>)
  $: employee = account ? $employeeByIdStore.get(account.employee) : undefined

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
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>
<div class="flex-between header bottom-divider">
  <div class="flex-row-center">
    <div class="clear-mins flex-no-shrink mr-4">
      <ActionIcon
        icon={IconBack}
        size="medium"
        action={() => {
          dispatch('close')
        }}
      />
    </div>
    {#if employee}
      <Avatar size="smaller" avatar={employee.avatar} />
      <span class="font-medium mx-2">{getName(employee)}</span>
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
      {#each docs as item, i (item._id)}
        <NotificationView
          value={item}
          selected={selected === i}
          {viewlets}
          on:keydown={onKeydown}
          on:click={() => {
            selected = i
            changeSelected(selected)
          }}
        />
      {/each}
    {/if}
  </Scroller>
</div>

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
</style>
