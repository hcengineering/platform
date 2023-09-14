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
  export let viewlets: Map<ActivityKey, TxViewlet[]>
  export let selected: boolean
  export let preview: boolean = false

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

  function showMenu (e: MouseEvent) {
    showPopup(Menu, { object: value, baseMenuClass: value._class }, getEventPositionElement(e))
  }

  let div: HTMLDivElement
  $: if (selected && div !== undefined) div.focus()

  let notificationPreviewPresenter: AnySvelteComponent | undefined = undefined
  $: notificationPreviewPresenterRes = hierarchy.classHierarchyMixin(
    value.attachedToClass,
    notification.mixin.NotificationPreview
  )?.presenter
  $: if (notificationPreviewPresenterRes) {
    getResource(notificationPreviewPresenterRes).then((res) => (notificationPreviewPresenter = res))
  }

  let object: Doc | undefined
  const objQuery = createQuery()
  $: objQuery.query(value.attachedToClass, { _id: value.attachedTo }, (res) => {
    ;[object] = res
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
{#if doc}
  <div bind:this={div} class="inbox-activity__container" class:selected tabindex="-1" on:keydown on:click>
    {#if newTxes > 0 && !selected}<div class="notify" />{/if}
    <div class="inbox-activity__content" class:read={newTxes === 0} on:contextmenu|preventDefault={showMenu}>
      <div class="flex-row-center flex-no-shrink mr-8">
        {#if presenter}
          <svelte:component this={presenter} value={doc} accent disabled inbox />
        {/if}
        {#if newTxes > 0 && !selected}
          <div class="counter float">{newTxes}</div>
        {/if}
      </div>
      {#if preview && object && notificationPreviewPresenter !== undefined}
        <div class="mt-2">
          <svelte:component this={notificationPreviewPresenter} {object} {newTxes} />
        </div>
      {/if}
      {#if !preview || notificationPreviewPresenter === undefined}
        <div class="flex-between flex-baseline mt-3">
          {#if tx}
            <TxView {tx} {viewlets} objectId={value.attachedTo} />
          {/if}
          <div class="time">
            <TimeSince value={tx?.modifiedOn} />
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
