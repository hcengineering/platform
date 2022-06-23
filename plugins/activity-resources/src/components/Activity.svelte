<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import activity, { TxViewlet } from '@anticrm/activity'
  import chunter from '@anticrm/chunter'
  import core, { Class, Doc, Ref, SortingOrder } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import notification from '@anticrm/notification'
  import { Component, Grid, IconActivity, Label, Scroller } from '@anticrm/ui'
  import { ActivityKey, activityKey, DisplayTx, newActivity } from '../activity'
  import TxView from './TxView.svelte'
  import { filterCollectionTxes } from './utils'
  import { Writable } from 'svelte/store'

  export let object: Doc
  export let integrate: boolean = false
  export let showCommenInput: boolean = true
  export let transparent: boolean = false

  let txes: DisplayTx[] = []

  const client = getClient()
  const attrs = client.getHierarchy().getAllAttributes(object._class)

  const activityQuery = newActivity(client, attrs)
  getResource(notification.function.GetNotificationClient).then((res) => {
    lastViews = res().getLastViews()
  })
  let lastViews: Writable<Map<Ref<Doc>, number>> | undefined

  let viewlets: Map<ActivityKey, TxViewlet>

  let allViewlets: TxViewlet[] = []
  let editableMap: Map<Ref<Class<Doc>>, boolean> | undefined = undefined

  const descriptors = createQuery()
  $: descriptors.query(activity.class.TxViewlet, {}, (result) => {
    allViewlets = result
    editableMap = new Map(
      allViewlets
        .filter((tx) => tx.txClass === core.class.TxCreateDoc)
        .map((it) => [it.objectClass, it.editable ?? false])
    )
  })

  $: viewlets = new Map(allViewlets.map((r) => [activityKey(r.objectClass, r.txClass), r]))

  function updateTxes (object: Doc): void {
    activityQuery.update(
      object,
      (result) => {
        txes = filterCollectionTxes(result)
      },
      SortingOrder.Descending,
      editableMap ?? new Map()
    )
  }

  $: if (editableMap) updateTxes(object)

  $: newTxPos = newTx(txes, $lastViews)

  function newTx (txes: DisplayTx[], lastViews: Map<Ref<Doc>, number> | undefined): number {
    const lastView = lastViews?.get(object._id)
    if (lastView === undefined || lastView === -1) return -1
    for (let index = 0; index < txes.length; index++) {
      const tx = txes[index]
      if (tx.tx.modifiedOn <= lastView) return index - 1
    }
    return -1
  }
</script>

{#if !integrate || transparent}
  {#if transparent !== undefined && !transparent}
    <div class="ac-header short mirror-tool highlight">
      <div class="ac-header__wrap-title">
        <div class="flex-center icon"><IconActivity size={'small'} /></div>
        <span class="ac-header__title"><Label label={activity.string.Activity} /></span>
      </div>
    </div>
  {/if}
  <div class="flex-col flex-grow min-h-0" class:background-accent-bg-color={!transparent}>
    <Scroller>
      <div class="p-10 select-text" id={activity.string.Activity}>
        {#if txes}
          <Grid column={1} rowGap={1.5}>
            {#each txes as tx, i}
              <TxView {tx} {viewlets} isNew={newTxPos === i} />
            {/each}
          </Grid>
        {/if}
      </div>
    </Scroller>
    {#if showCommenInput}
      <div class="ref-input">
        <Component is={chunter.component.CommentInput} props={{ object }} />
      </div>
    {/if}
  </div>
{:else}
  <slot />
  <div class="antiDivider" style:margin={'1rem -1.5rem'} />
  <div class="header antiTitle">
    <div class="icon-wrapper">
      <div class="wrapped-icon icon flex-center"><IconActivity size={'small'} /></div>
      <span class="wrapped-title"><Label label={activity.string.Activity} /></span>
    </div>
  </div>
  {#if showCommenInput}
    <div class="ref-input">
      <Component is={chunter.component.CommentInput} props={{ object }} />
    </div>
  {/if}
  <div class="p-activity select-text" id={activity.string.Activity}>
    {#if txes}
      <Grid column={1} rowGap={1.5}>
        {#each txes as tx, i}
          <TxView {tx} {viewlets} isNew={newTxPos === i} />
        {/each}
      </Grid>
    {/if}
  </div>
{/if}

<style lang="scss">
  .header {
    display: flex;
    align-items: center;
    min-height: 2.5rem;
    height: 2.5rem;
    background-color: var(--accent-bg-color);
    border: 1px solid var(--divider-color);
    border-radius: 0.125rem;
  }
  .icon {
    margin-left: 1rem;
    height: 2rem;
    color: var(--caption-color);
  }
  .ref-input {
    flex-shrink: 0;
    padding: 0.75rem 0;
  }
  .p-activity {
    padding: 1.5rem 0;
  }

  :global(.grid .msgactivity-container:last-child::after) {
    content: none;
  } // Remove the line in the last Activity message
</style>
