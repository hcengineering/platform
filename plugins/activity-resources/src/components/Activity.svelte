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
  import activity, { DisplayTx, TxViewlet } from '@hcengineering/activity'
  import chunter from '@hcengineering/chunter'
  import core, { Class, Doc, Ref, SortingOrder } from '@hcengineering/core'
  import notification, { LastView } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, Grid, Label, Spinner } from '@hcengineering/ui'
  import { Writable } from 'svelte/store'
  import { ActivityKey, activityKey, newActivity } from '../activity'
  import { filterCollectionTxes } from '../utils'
  import ActivityFilter from './ActivityFilter.svelte'
  import TxView from './TxView.svelte'

  export let object: Doc
  export let showCommenInput: boolean = true
  export let transparent: boolean = false

  let txes: DisplayTx[] = []

  const client = getClient()
  const attrs = client.getHierarchy().getAllAttributes(object._class)

  const activityQuery = newActivity(client, attrs)
  getResource(notification.function.GetNotificationClient).then((res) => {
    lastViews = res().getLastViews()
  })
  let lastViews: Writable<LastView> | undefined

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

  let loading = false

  function updateTxes (object: Doc): void {
    loading = true
    activityQuery.update(
      object,
      (result) => {
        console.log('query txes update')
        txes = filterCollectionTxes(result)

        if (txes.length > 0) {
          loading = false
        }
      },
      SortingOrder.Ascending,
      editableMap ?? new Map()
    )
  }

  $: if (editableMap) updateTxes(object)

  let filtered: DisplayTx[] = []

  $: newTxPos = newTx(filtered, $lastViews)

  function newTx (txes: DisplayTx[], lastViews: LastView | undefined): number {
    const lastView = (lastViews as any)?.[object._id]
    if (lastView === undefined || lastView === -1) return -1
    for (let index = 0; index < txes.length; index++) {
      const tx = txes[index]
      if (tx.tx.modifiedOn > lastView) return index - 1
    }
    return -1
  }
</script>

<div class="antiSection-header high mt-9" class:invisible={transparent}>
  <span class="antiSection-header__title flex-row-center">
    <Label label={activity.string.Activity} />
    {#if loading}
      <div class="ml-1">
        <Spinner size={'small'} />
      </div>
    {/if}
  </span>
  <ActivityFilter {txes} {object} on:update={(e) => (filtered = e.detail)} />
</div>
<div class="p-activity select-text" id={activity.string.Activity}>
  {#if filtered}
    <Grid column={1} rowGap={0.75}>
      {#each filtered as tx, i}
        <TxView {tx} {viewlets} isNew={newTxPos < i && newTxPos !== -1} isNextNew={newTxPos <= i && newTxPos !== -1} />
      {/each}
    </Grid>
  {/if}
</div>
{#if showCommenInput}
  <div class="ref-input">
    <Component is={chunter.component.CommentInput} props={{ object }} />
  </div>
{/if}

<style lang="scss">
  .ref-input {
    flex-shrink: 0;
    margin-top: 1.75rem;
    padding-bottom: 2.5rem;
  }
  .p-activity {
    margin-top: 1.75rem;
  }
  .invisible {
    display: none;
  }

  :global(.grid .msgactivity-container.showIcon:last-child::after) {
    content: none;
  } // Remove the line in the last Activity message
</style>
