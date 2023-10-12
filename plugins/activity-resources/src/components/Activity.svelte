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
  import notification, { DocUpdateTx, DocUpdates, Writable } from '@hcengineering/notification'
  import { getResource } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Component, Grid, Label, Lazy, Spinner } from '@hcengineering/ui'
  import { ActivityKey, activityKey, newActivity } from '../activity'
  import { filterCollectionTxes } from '../utils'
  import ActivityFilter from './ActivityFilter.svelte'
  import TxView from './TxView.svelte'

  export let object: Doc
  export let showCommenInput: boolean = true
  export let transparent: boolean = false
  export let shouldScroll: boolean = false
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

  getResource(notification.function.GetNotificationClient).then((res) => {
    updatesStore = res().docUpdatesStore
  })
  let updatesStore: Writable<Map<Ref<Doc>, DocUpdates>> | undefined

  $: updates = $updatesStore?.get(object._id)
  $: newTxes = updates?.txes ?? []

  let txes: DisplayTx[] = []

  const client = getClient()
  const attrs = client.getHierarchy().getAllAttributes(object._class)

  const activityQuery = newActivity(client, attrs)

  let viewlets: Map<ActivityKey, TxViewlet[]> = new Map()

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

  $: viewlets = buildViewletsMap(allViewlets)

  function buildViewletsMap (allViewlets: TxViewlet[]): Map<ActivityKey, TxViewlet[]> {
    const viewlets = new Map()
    for (const res of allViewlets) {
      const key = activityKey(res.objectClass, res.txClass)
      const arr = viewlets.get(key) ?? []
      arr.push(res)
      viewlets.set(key, arr)
    }
    return viewlets
  }

  let loading = false

  function updateTxes (
    objectId: Ref<Doc>,
    objectClass: Ref<Class<Doc>>,
    editableMap: Map<Ref<Class<Doc>>, boolean> | undefined
  ): void {
    loading = true
    const res = activityQuery.update(
      objectId,
      objectClass,
      (_id, result) => {
        if (_id === objectId) {
          txes = filterCollectionTxes(result)

          if (txes.length > 0) {
            loading = false
          }
        }
      },
      SortingOrder.Ascending,
      editableMap ?? new Map()
    )
    if (!res) {
      loading = false
    }
  }

  $: updateTxes(object._id, object._class, editableMap)

  let filtered: DisplayTx[] = []

  let newTxIndexes: number[] = []
  $: newTxIndexes = getNewTxes(filtered, newTxes)

  function getNewTxes (filtered: DisplayTx[], newTxes: DocUpdateTx[]): number[] {
    const res: number[] = []
    for (let i = 0; i < filtered.length; i++) {
      if (isNew(filtered[i], newTxes)) {
        res.push(i)
      }
    }
    return res
  }

  function isNew (tx: DisplayTx | undefined, newTxes: DocUpdateTx[]): boolean {
    if (tx === undefined) return false
    const index = newTxes.findIndex((p) => p._id === tx.originTx._id && p.isNew)
    return index !== -1
  }

  $: scrollIndex = shouldScroll ? newTxIndexes[0] ?? filtered.length - 1 : -1
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
  <ActivityFilter
    {txes}
    {object}
    on:update={(e) => {
      filtered = e.detail
    }}
  />
</div>
<div class="p-activity select-text" id={activity.string.Activity}>
  {#if filtered}
    <Grid column={1} rowGap={0.75}>
      {#each filtered as tx, i}
        <Lazy>
          <TxView
            {tx}
            {viewlets}
            isNew={newTxIndexes.includes(i)}
            isNextNew={newTxIndexes.includes(i + 1)}
            shouldScroll={i === scrollIndex}
            {boundary}
          />
        </Lazy>
      {/each}
    </Grid>
  {/if}
</div>
{#if showCommenInput}
  <div class="ref-input">
    <Component is={chunter.component.CommentInput} props={{ object, focusIndex, boundary }} />
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
