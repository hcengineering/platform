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
  import { TxViewlet } from '@hcengineering/activity'
  import { ActivityKey } from '@hcengineering/activity-resources'
  import { PersonAccount, getName } from '@hcengineering/contact'
  import { Avatar, personByIdStore } from '@hcengineering/contact-resources'
  import core, { Doc, TxCUD, TxProcessor } from '@hcengineering/core'
  import notification, { DocUpdates } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { ActionIcon, AnySvelteComponent, Label, TimeSince } from '@hcengineering/ui'
  import view from '@hcengineering/view'

  import TxView from './TxView.svelte'
  import ArrowRight from './icons/ArrowRight.svelte'

  export let value: PersonAccount
  export let items: DocUpdates[]
  export let viewlets: Map<ActivityKey, TxViewlet[]>
  export let selected: boolean

  $: firstItem = items[0]

  $: employee = $personByIdStore.get(value.person)

  $: newTxes = items.reduce((acc, cur) => acc + cur.txes.filter((p) => p.isNew && p.modifiedBy === value._id).length, 0) // items.length
  const dispatch = createEventDispatcher()

  let doc: Doc | undefined = undefined
  let tx: TxCUD<Doc> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  $: txRef = firstItem ? firstItem.txes[firstItem.txes.length - 1]._id : undefined

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

  $: if (selected && div != null) div.focus()
</script>

{#if doc}
  <div
    class="inbox-activity__container"
    on:keydown
    class:selected
    tabindex="-1"
    bind:this={div}
    on:click={() => dispatch('open', value._id)}
  >
    {#if newTxes > 0 && !selected}<div class="notify people" />{/if}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="inbox-activity__content shrink flex-grow clear-mins" class:read={newTxes === 0}>
      <div class="flex-row-center gap-2">
        <Avatar avatar={employee?.avatar} size={'small'} name={employee?.name} />
        {#if employee}
          <span class="font-medium">{getName(client.getHierarchy(), employee)}</span>
        {:else}
          <span class="font-medium"><Label label={core.string.System} /></span>
        {/if}
        {#if newTxes > 0}
          <div class="counter people">
            {newTxes}
          </div>
        {/if}
        <div class="arrow">
          <ActionIcon
            icon={ArrowRight}
            size="medium"
            action={() => {
              dispatch('open', value._id)
            }}
          />
        </div>
      </div>
      <div class="clear-mins flex-no-shrink mt-4">
        {#if presenter}
          <svelte:component this={presenter} value={doc} inline disabled inbox />
        {/if}
      </div>
      <div class="flex-between flex-baseline mt-3">
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
