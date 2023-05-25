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
  import core, { Doc, TxCUD, TxProcessor } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, TimeSince, getEventPositionElement, showPopup } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { Menu } from '@hcengineering/view-resources'
  import TxView from './TxView.svelte'

  export let value: DocUpdates
  export let viewlets: Map<ActivityKey, TxViewlet>
  export let selected: boolean

  let doc: Doc | undefined = undefined
  let tx: TxCUD<Doc> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: value.txes[0] &&
    client.findOne(core.class.TxCUD, { _id: value.txes[0]._id }).then((res) => {
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

  const docQuery = createQuery()
  $: docQuery.query(value.attachedToClass, { _id: value.attachedTo }, (res) => {
    ;[doc] = res
  })

  $: newTxes = value.txes.filter((p) => p.isNew).length

  function showMenu (e: MouseEvent) {
    showPopup(Menu, { object: value, baseMenuClass: value._class }, getEventPositionElement(e))
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="container cursor-pointer" class:selected>
  <div class="notify" class:hidden={newTxes === 0} />
  {#if doc}
    <div
      class="clear-mins content bottom-divider"
      class:read={newTxes === 0}
      on:contextmenu|preventDefault={showMenu}
      on:click
    >
      <div class="w-full">
        <div class="flex-between">
          {#if presenter}
            <svelte:component this={presenter} value={doc} inline />
          {/if}
          {#if newTxes > 0}
            <div class="counter">
              {newTxes}
            </div>
          {/if}
        </div>
        <div class="flex-between mt-2">
          {#if tx}
            <TxView {tx} {viewlets} objectId={value.attachedTo} />
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
    margin-top: 0.75rem;
    margin-right: 0.5rem;
    background-color: #2b5190;
    border-radius: 50%;
    &.hidden {
      opacity: 0;
    }
  }

  .counter {
    display: flex;
    align-self: flex-start;
    align-items: center;
    justify-content: center;
    height: 1.25rem;
    width: 1.25rem;
    color: #2b5190;
    background-color: var(--theme-calendar-today-bgcolor);
    border-radius: 50%;
  }
</style>
