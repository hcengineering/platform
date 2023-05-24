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
  import { EmployeeAccount, getName } from '@hcengineering/contact'
  import { Avatar, employeeByIdStore } from '@hcengineering/contact-resources'
  import core, { Doc, TxCUD, TxProcessor } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ActionIcon, AnySvelteComponent, Label, TimeSince } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import TxView from './TxView.svelte'
  import ArrowRight from './icons/ArrowRight.svelte'

  export let value: EmployeeAccount
  export let items: DocUpdates[]
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let selected: boolean

  $: firstItem = items[0]

  $: employee = $employeeByIdStore.get(value.employee)

  $: newTxes = items.reduce((acc, cur) => acc + cur.txes.filter((p) => p.isNew && p.modifiedBy === value._id).length, 0) // items.length
  const dispatch = createEventDispatcher()

  let doc: Doc | undefined = undefined
  let tx: TxCUD<Doc> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: firstItem?.txes[0] &&
    client.findOne(core.class.TxCUD, { _id: firstItem.txes[0]._id }).then((res) => {
      if (res !== undefined) {
        tx = TxProcessor.extractTx(res) as TxCUD<Doc>
      } else {
        tx = res
      }
    })

  let presenter: AnySvelteComponent | undefined = undefined
  $: presenterRes =
    hierarchy.classHierarchyMixin(firstItem.attachedToClass, notification.mixin.NotificationObjectPresenter)
      ?.presenter ?? hierarchy.classHierarchyMixin(firstItem.attachedToClass, view.mixin.ObjectPresenter)?.presenter
  $: if (presenterRes) {
    getResource(presenterRes).then((res) => (presenter = res))
  }

  const docQuery = createQuery()
  $: docQuery.query(firstItem.attachedToClass, { _id: firstItem.attachedTo }, (res) => {
    ;[doc] = res
  })

  let div: HTMLDivElement

  $: if (selected && div !== undefined) div.focus()
</script>

<div
  class="container cursor-pointer"
  on:keydown
  class:selected
  tabindex="-1"
  bind:this={div}
  on:click={() => dispatch('open', value._id)}
>
  <div class="notify" class:hidden={newTxes === 0} />
  {#if doc}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="clear-mins content bottom-divider" class:read={newTxes === 0}>
      <div class="w-full">
        <div class="flex-between mb-2">
          <div class="flex-row-center flex-gap-2">
            <Avatar avatar={employee?.avatar} size="small" />
            {#if employee}
              <span class="font-medium">{getName(employee)}</span>
            {:else}
              <span class="font-medium"><Label label={core.string.System} /></span>
            {/if}
            {#if newTxes > 0}
              <div class="counter">
                {newTxes}
              </div>
            {/if}
          </div>
          <div>
            <ActionIcon
              icon={ArrowRight}
              size="medium"
              action={() => {
                dispatch('open', value._id)
              }}
            />
          </div>
        </div>
        <div>
          {#if presenter}
            <svelte:component this={presenter} value={doc} inline />
          {/if}
        </div>
        <div class="flex-between mt-2">
          {#if tx && firstItem}
            <TxView {tx} {viewlets} objectId={firstItem.attachedTo} />
          {/if}
          <div class="time">
            <TimeSince value={tx?.modifiedOn} />
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .time {
    align-self: flex-end;
    margin-bottom: 0.25rem;
  }

  .container {
    margin-right: 0.5rem;
    margin-left: 0.5rem;
    display: flex;
    border-radius: 0.25rem;
    flex-grow: 1;

    &:focus-visible {
      outline: none;
    }

    &:hover {
      background-color: var(--highlight-hover);
    }
    &.selected {
      background-color: var(--highlight-select);

      &:hover {
        background-color: var(--highlight-select-hover);
      }
    }

    .content {
      margin-right: 0.5rem;
      display: flex;
      flex-grow: 1;
      padding: 0.5rem 0;

      &.read {
        opacity: 0.6;
      }
    }
  }

  .notify {
    height: 0.5rem;
    width: 0.5rem;
    min-width: 0.5rem;
    margin-top: 1.25rem;
    margin-right: 0.5rem;
    background-color: #2b5190;
    border-radius: 50%;
    &.hidden {
      opacity: 0;
    }
  }

  .counter {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 1.25rem;
    width: 1.25rem;
    color: #2b5190;
    background-color: var(--theme-calendar-today-bgcolor);
    border-radius: 50%;
  }
</style>
