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
  import { TxViewlet } from '@hcengineering/activity'
  import { ActivityKey } from '@hcengineering/activity-resources'
  import contact, { EmployeeAccount, getName } from '@hcengineering/contact'
  import { Avatar, employeeByIdStore } from '@hcengineering/contact-resources'
  import core, { Doc, Ref, TxCUD, TxProcessor } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, Label, TimeSince } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import TxView from './TxView.svelte'

  export let value: DocUpdates
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let selected: boolean
  let doc: Doc | undefined = undefined
  let tx: TxCUD<Doc> | undefined = undefined

  let account: EmployeeAccount | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: value.lastTx &&
    client.findOne(core.class.TxCUD, { _id: value.lastTx }).then((res) => {
      if (res !== undefined) {
        tx = TxProcessor.extractTx(res) as TxCUD<Doc>
      } else {
        tx = res
      }
    })

  let presenter: AnySvelteComponent | undefined = undefined
  $: presenterRes =
    hierarchy.classHierarchyMixin(value.attachedToClass, notification.mixin.NotificationObjectPresenter)?.presenter ??
    hierarchy.classHierarchyMixin(value.attachedToClass, view.mixin.ObjectPresenter)?.presenter
  $: if (presenterRes) {
    getResource(presenterRes).then((res) => (presenter = res))
  }

  const query = createQuery()
  $: tx &&
    query.query(contact.class.EmployeeAccount, { _id: tx.modifiedBy as Ref<EmployeeAccount> }, (r) => ([account] = r))
  $: employee = account && $employeeByIdStore.get(account.employee)

  const dispatch = createEventDispatcher()

  const docQuery = createQuery()
  $: docQuery.query(value.attachedToClass, { _id: value.attachedTo }, (res) => ([doc] = res))

  $: newTxes = value.txes.length
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if doc}
  <div
    class="container cursor-pointer bottom-divider"
    class:selected
    on:click={() => dispatch('click', { _id: value.attachedTo, _class: value.attachedToClass })}
  >
    <div class="content">
      <div class="header flex">
        <Avatar avatar={employee?.avatar} size="medium" />
        <div class="ml-2 w-full clear-mins">
          <div class="flex-between mb-1">
            <div class="caption-color flex">
              {#if employee}
                {getName(employee)}
              {:else}
                <Label label={core.string.System} />
              {/if}
              {#if newTxes > 0}
                <div class="counter ml-2">
                  {newTxes}
                </div>
              {/if}
            </div>
            <div class="flex-center">
              <div class="time ml-2"><TimeSince value={tx?.modifiedOn} /></div>
            </div>
          </div>
          {#if presenter}
            <svelte:component this={presenter} value={doc} />
          {/if}
        </div>
      </div>
      {#if tx}
        <TxView {tx} {viewlets} />
      {/if}
    </div>
  </div>
{/if}

<style lang="scss">
  .content {
    padding: 0.5rem;
  }

  .container {
    &:hover {
      background-color: var(--board-card-bg-hover);
    }
    &.selected {
      background-color: var(--board-card-bg-hover);
    }
  }

  .counter {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid;
    border-color: var(--divider-color);
    border-radius: 50%;
    height: 1.25rem;
    width: 1.25rem;
  }
</style>
