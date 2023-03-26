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
  import activity, { TxViewlet, ActivityFilter } from '@hcengineering/activity'
  import chunter from '@hcengineering/chunter'
  import core, { Class, Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { getResource, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import notification from '@hcengineering/notification'
  import {
    Component,
    Grid,
    IconActivity,
    Label,
    Scroller,
    Icon,
    showPopup,
    Spinner,
    ActionIcon,
    eventToHTMLElement
  } from '@hcengineering/ui'
  import { ActivityKey, activityKey, DisplayTx, newActivity } from '../activity'
  import TxView from './TxView.svelte'
  import { filterCollectionTxes } from '../utils'
  import { Writable } from 'svelte/store'
  import activityPlg from '../plugin'
  import FilterPopup from './FilterPopup.svelte'
  import IconFilter from './icons/Filter.svelte'
  import IconClose from './icons/Close.svelte'

  export let object: Doc
  export let integrate: boolean = false
  export let showCommenInput: boolean = true
  export let transparent: boolean = false

  let txes: DisplayTx[] = []

  const client = getClient()
  const attrs = client.getHierarchy().getAllAttributes(object._class)

  let labels: IntlString[] = []
  const filters: ActivityFilter[] = []
  const saved = localStorage.getItem('activity-filter')
  let selectedFilter: Ref<Doc>[] | 'All' =
    saved !== null && saved !== undefined ? (JSON.parse(saved) as Ref<Doc>[] | 'All') : 'All'
  $: localStorage.setItem('activity-filter', JSON.stringify(selectedFilter))
  client.findAll(activity.class.ActivityFilter, {}).then((res) => {
    res.map((it) => filters.push(it))
    if (saved !== null && saved !== undefined) {
      const temp: Ref<Doc>[] | 'All' = JSON.parse(saved)
      if (temp !== 'All' && Array.isArray(temp)) {
        selectedFilter = temp.filter((it) => filters.findIndex((f) => it === f._id) > -1)
        if ((selectedFilter as Ref<Doc>[]).length === 0) selectedFilter = 'All'
      } else selectedFilter = 'All'
    }
  })

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

  let loading = false

  function updateTxes (object: Doc): void {
    loading = true
    activityQuery.update(
      object,
      (result) => {
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

  $: newTxPos = newTx(filtered, $lastViews)

  function newTx (txes: DisplayTx[], lastViews: Map<Ref<Doc>, number> | undefined): number {
    const lastView = lastViews?.get(object._id)
    if (lastView === undefined || lastView === -1) return -1
    for (let index = 0; index < txes.length; index++) {
      const tx = txes[index]
      if (tx.tx.modifiedOn <= lastView) return index - 1
    }
    return -1
  }

  const handleOptions = (ev: MouseEvent) => {
    showPopup(
      FilterPopup,
      { selectedFilter, filters },
      eventToHTMLElement(ev),
      () => {},
      (res) => {
        if (res === undefined) return
        if (res.action === 'select') selectedFilter = res.value as Ref<Doc>[] | 'All'
      }
    )
  }

  let filterActions: ((tx: DisplayTx, _class?: Ref<Doc>) => boolean)[] = [] // Enabled filters
  const updateFiltered = () => (filtered = txes.filter((it) => filterActions.some((f) => f(it, object._class))))
  async function updateFilterActions (fls: ActivityFilter[], selected: Ref<Doc>[] | 'All'): Promise<void> {
    if (selected === 'All' || !Array.isArray(selected)) filterActions = [() => true]
    else {
      const tf = fls.filter((filter) => (selected as Ref<Doc>[]).includes(filter._id))
      filterActions = []
      labels = []
      tf.forEach((filter) => {
        labels.push(filter.label)
        getResource(filter.filter).then((res) => filterActions.push(res))
      })
    }
    setTimeout(() => updateFiltered(), 0)
  }
  $: updateFilterActions(filters, selectedFilter)
  $: filtered = txes.filter((it) => filterActions.some((f) => f(it, object._class)))
</script>

{#if !integrate || transparent}
  <!-- OLD TRANSPARENT -->
  {#if transparent !== undefined && !transparent}
    <div class="ac-header short mirror-tool highlight">
      <div class="ac-header__wrap-title">
        <div class="flex-center icon"><IconActivity size={'small'} /></div>
        <span class="ac-header__title flex-row-center">
          <Label label={activity.string.Activity} />
          {#if loading}
            <div class="ml-1">
              <Spinner size={'small'} />
            </div>
          {/if}
        </span>
      </div>
    </div>
  {/if}
  <div class="flex-col flex-grow min-h-0" class:background-accent-bg-color={!transparent}>
    <Scroller>
      <div class="p-10 select-text" id={activity.string.Activity}>
        {#if filtered}
          <Grid column={1} rowGap={1.5}>
            {#each filtered as tx, i}
              <TxView
                {tx}
                {viewlets}
                isNew={newTxPos >= i && newTxPos !== -1}
                isNextNew={newTxPos > i && newTxPos !== -1}
              />
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
  <!-- MODERN -->
  <slot />
  <!-- <div class="antiDivider" style:margin={'1rem -1.5rem'} /> -->
  <div class="antiSection-header high mt-9">
    <span class="antiSection-header__title flex-row-center">
      <Label label={activity.string.Activity} />
      {#if loading}
        <div class="ml-1">
          <Spinner size={'small'} />
        </div>
      {/if}
    </span>
    {#if selectedFilter === 'All'}
      <div class="antiSection-header__tag highlight">
        <Label label={activityPlg.string.All} />
      </div>
    {:else}
      {#each labels as label}
        <div class="antiSection-header__tag overflow-label">
          <Label {label} />
          <div class="tag-icon">
            <Icon icon={IconClose} size={'small'} />
          </div>
        </div>
      {/each}
    {/if}
    <div class="w-4 min-w-4 max-w-4" />
    <ActionIcon icon={IconFilter} size={'medium'} action={handleOptions} />
  </div>
  <div class="p-activity select-text" id={activity.string.Activity}>
    {#if filtered}
      <Grid column={1} rowGap={0.75}>
        {#each filtered as tx, i}
          <TxView
            {tx}
            {viewlets}
            isNew={newTxPos >= i && newTxPos !== -1}
            isNextNew={newTxPos > i && newTxPos !== -1}
          />
        {/each}
      </Grid>
    {/if}
  </div>
  {#if showCommenInput}
    <div class="ref-input">
      <Component is={chunter.component.CommentInput} props={{ object }} />
    </div>
  {/if}
{/if}

<style lang="scss">
  .icon {
    margin-left: 1rem;
    height: 2rem;
    color: var(--caption-color);
  }
  .ref-input {
    flex-shrink: 0;
    margin-top: 1.75rem;
    padding-bottom: 2.5rem;
  }
  .p-activity {
    margin-top: 1.75rem;
  }

  :global(.grid .msgactivity-container.showIcon:last-child::after) {
    content: none;
  } // Remove the line in the last Activity message
</style>
