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
  import { ActivityKey, activityKey } from '@hcengineering/activity-resources'
  import core, { Doc, TxCUD, TxProcessor } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { AnySvelteComponent, TimeSince } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import TxView from './TxView.svelte'

  export let value: DocUpdates
  export let selected: boolean

  let viewlets: Map<ActivityKey, TxViewlet>

  const descriptors = createQuery()
  descriptors.query(activity.class.TxViewlet, {}, (result) => {
    viewlets = new Map(result.map((r) => [activityKey(r.objectClass, r.txClass), r]))
  })

  let doc: Doc | undefined = undefined
  let tx: TxCUD<Doc> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: txRef = value.txes[value.txes.length - 1]._id

  $: txRef &&
    client.findOne(core.class.TxCUD, { _id: txRef }).then((res) => {
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

  let div: HTMLDivElement
  $: if (selected && div !== undefined) div.focus()
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if doc}
  <div bind:this={div} class="inbox-activity__container w-165 h-20 pl-4 pr-4 card" tabindex="-1" on:keydown on:click>
    {#if newTxes > 0 && !selected}<div class="notify" />{/if}
    <div class="inbox-activity__content flex-grow clear-mins" class:read={newTxes === 0}>
      <div class="flex-row-center flex-no-shrink mr-8">
        {#if presenter}
          <svelte:component this={presenter} value={doc} inline accent />
        {/if}
        {#if newTxes > 0 && !selected}
          <div class="counter float mr-4">{newTxes}</div>
        {/if}
      </div>
      <div class="flex-between flex-baseline mt-3">
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

<style lang="scss">
  .card {
    background-color: var(--theme-button-hovered);
    border: 1px solid var(--theme-button-border);
    border-radius: 1rem;
  }
</style>
