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
  import { Class, Doc, DocumentQuery, FindOptions, FindResult, Ref, SortingOrder } from '@hcengineering/core'
  import { Asset, getResource, IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { DocWithRank, makeRank } from '@hcengineering/task'
  import { IconSize } from '@hcengineering/ui'
  import { SvelteComponent } from 'svelte'
  import { getListItemPresenter, getObjectPresenter } from '../../utils'
  import SortableList from './SortableList.svelte'

  export let _class: Ref<Class<Doc>>
  export let label: IntlString | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let queryOptions: FindOptions<Doc> | undefined = undefined
  export let presenterProps: Record<string, any> = {}
  export let direction: 'row' | 'column' = 'column'
  export let flipDuration = 200
  export let itemsCount = 0
  export let icon: Asset | undefined = undefined
  export let iconSize: IconSize = 'small'

  const SORTING_ORDER = SortingOrder.Ascending
  const client = getClient()
  const hierarchy = client.getHierarchy()
  const itemsQuery = createQuery()

  let isPresenterLoading = false
  let areItemsloading = true
  let areItemsSorting = false

  let presenter: typeof SvelteComponent | undefined
  let items: Doc[] = []

  async function updatePresenter (classRef: Ref<Class<Doc>>) {
    try {
      isPresenterLoading = true

      const listItemPresenter = await getListItemPresenter(client, classRef)
      if (listItemPresenter) {
        presenter = await getResource(listItemPresenter)
        return
      }

      const objectModel = await getObjectPresenter(client, classRef, { key: '' })
      if (objectModel?.presenter) {
        presenter = objectModel.presenter
      }
    } finally {
      isPresenterLoading = false
    }
  }

  function updateItems (newItems: FindResult<Doc>): void {
    items = newItems
    areItemsloading = false
  }

  $: !$$slots.object && updatePresenter(_class)
  $: itemsQuery.query(_class, query, updateItems, {
    ...(isSortable ? { sort: { rank: SORTING_ORDER } } : {}),
    ...(queryOptions ?? {}),
    limit: Math.max(queryOptions?.limit ?? 0, 200)
  })

  $: isSortable = hierarchy.getAllAttributes(_class).has('rank')

  async function handleMove (
    e: CustomEvent<{ item: DocWithRank, prev: DocWithRank | undefined, next: DocWithRank | undefined }>
  ): Promise<void> {
    if (!isSortable) return
    const { item, prev, next } = e.detail
    const sortingOrder = queryOptions?.sort?.rank ?? SORTING_ORDER
    const rank =
      sortingOrder === SortingOrder.Ascending ? makeRank(prev?.rank, next?.rank) : makeRank(next?.rank, prev?.rank)

    try {
      areItemsSorting = true
      await client.update(item, { rank })
    } finally {
      areItemsSorting = false
    }
  }
</script>

<SortableList {items} {label} {direction} {flipDuration} {icon} {iconSize} bind:itemsCount on:move={handleMove}>
  <svelte:fragment slot="object" let:value>
    {#if $$slots.object}
      <slot name="object" {value} />
    {:else if presenter}
      <svelte:component this={presenter} {...presenterProps} {value} />
    {/if}
  </svelte:fragment>
</SortableList>
