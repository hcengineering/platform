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
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import { calcRank, DocWithRank } from '@hcengineering/task'
  import { Button, Component, Icon, IconAdd, IconSize, Label, Loading } from '@hcengineering/ui'
  import view, { ObjectFactory } from '@hcengineering/view'
  import { flip } from 'svelte/animate'
  import { SvelteComponentDev } from 'svelte/internal'
  import { getListItemPresenter, getObjectPresenter } from '../../utils'

  /*
  How to use:
  
  We must add presenter for the "_class" via "ListItemPresenter" / "AttributePresenter"
  mixins or render the "object" slot to be able display the rows list.

  To create a new items, we should add "ObjectFactory" mixin also.

  We can create a custom list items or editor based on "SortableListItem"

  Important: the "ObjectFactory" component must emit the "close" event
*/

  export let _class: Ref<Class<Doc>>
  export let label: IntlString | undefined = undefined
  export let query: DocumentQuery<Doc> = {}
  export let queryOptions: FindOptions<Doc> | undefined = undefined
  export let presenterProps: Record<string, any> = {}
  export let direction: 'row' | 'column' = 'column'
  export let flipDuration = 200
  export let isAddButtonHidden = false
  export let isAddButtonDisabled = false
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

  let presenter: typeof SvelteComponentDev | undefined
  let objectFactory: ObjectFactory | undefined
  let items: FindResult<Doc> | undefined

  let draggingIndex: number | null = null
  let hoveringIndex: number | null = null

  let isCreating = false

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

  function updateObjectFactory (objectFactoryClassRef: Ref<Class<Doc>>) {
    const objectFactoryClass = hierarchy.getClass(objectFactoryClassRef)

    if (hierarchy.hasMixin(objectFactoryClass, view.mixin.ObjectFactory)) {
      objectFactory = hierarchy.as(objectFactoryClass, view.mixin.ObjectFactory)
    }
  }

  function updateItems (newItems: FindResult<Doc>): void {
    items = newItems
    areItemsloading = false
  }

  function handleDragStart (ev: DragEvent, itemIndex: number) {
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
    }

    draggingIndex = itemIndex
  }

  function handleDragOver (ev: DragEvent, itemIndex: number) {
    ev.preventDefault()

    hoveringIndex = itemIndex
  }

  async function handleDrop (itemIndex: number) {
    if (isSortable && items && draggingIndex !== null && draggingIndex !== itemIndex) {
      const item = items[draggingIndex] as DocWithRank
      const [prev, next] = [
        items[draggingIndex < itemIndex ? itemIndex : itemIndex - 1] as DocWithRank,
        items[draggingIndex < itemIndex ? itemIndex + 1 : itemIndex] as DocWithRank
      ]

      const sortingOrder = queryOptions?.sort?.rank ?? SORTING_ORDER
      const rank = sortingOrder === SortingOrder.Ascending ? calcRank(prev, next) : calcRank(next, prev)

      try {
        areItemsSorting = true
        await client.update(item, { rank })
      } finally {
        areItemsSorting = false
      }
    }

    resetDrag()
  }

  async function create () {
    if (objectFactory?.create) {
      const createFn = await getResource(objectFactory.create)
      await createFn(query)
      return
    }

    isCreating = true
  }

  function resetDrag () {
    draggingIndex = null
    hoveringIndex = null
  }

  $: !$$slots.object && updatePresenter(_class)
  $: updateObjectFactory(_class)
  $: itemsQuery.query(_class, query, updateItems, {
    ...(isSortable ? { sort: { rank: SORTING_ORDER } } : {}),
    ...(queryOptions ?? {}),
    limit: Math.max(queryOptions?.limit ?? 0, 200)
  })

  $: isLoading = isPresenterLoading || areItemsloading
  $: isSortable = hierarchy.getAllAttributes(_class).has('rank')
  $: itemsCount = items?.length ?? 0
</script>

<div class="flex-col">
  {#if label || !isAddButtonHidden}
    <div class="flex mb-4">
      {#if icon}
        <div class="mr-2 flex-center">
          <Icon {icon} size={iconSize} />
        </div>
      {/if}
      {#if label}
        <div class="title-wrapper">
          <span class="wrapped-title text-base caption-color">
            <Label {label} />
          </span>
        </div>
      {/if}
      {#if !isAddButtonHidden}
        <div class="ml-auto">
          <Button
            showTooltip={{ label: presentation.string.Add }}
            disabled={isAddButtonDisabled || isLoading || !objectFactory}
            width="min-content"
            icon={IconAdd}
            size="small"
            kind="ghost"
            on:click={create}
          />
        </div>
      {/if}
    </div>
  {/if}

  {#if isLoading}
    <Loading />
  {:else if ($$slots.object ?? presenter) && items}
    {@const isVertical = direction === 'column'}
    <div class="flex-gap-1" class:flex-col={isVertical} class:flex={!isVertical} class:flex-wrap={!isVertical}>
      {#each items as item, index (item._id)}
        {@const isDraggable = isSortable && items.length > 1 && !areItemsSorting}
        <div
          class="item"
          class:column={isVertical}
          class:row={!isVertical}
          class:is-dragged-over-before={draggingIndex !== null && index === hoveringIndex && index < draggingIndex}
          class:is-dragged-over-after={draggingIndex !== null && index === hoveringIndex && index > draggingIndex}
          draggable={isDraggable}
          animate:flip={{ duration: flipDuration }}
          on:dragstart={(ev) => handleDragStart(ev, index)}
          on:dragover={(ev) => handleDragOver(ev, index)}
          on:drop={() => handleDrop(index)}
          on:dragend={resetDrag}
        >
          {#if $$slots.object}
            <slot name="object" value={item} {isDraggable} />
          {:else if presenter}
            <svelte:component this={presenter} {isDraggable} {...presenterProps} value={item} />
          {/if}
        </div>
      {/each}

      {#if objectFactory?.component && isCreating}
        <!-- Important: the "close" event must be specified -->
        <Component is={objectFactory.component} props={query} showLoading on:close={() => (isCreating = false)} />
      {/if}
    </div>
  {/if}
</div>

<style lang="scss">
  .item {
    position: relative;

    &.is-dragged-over-before::before,
    &.is-dragged-over-after::before {
      position: absolute;
      content: '';
      inset: 0;
    }

    &.column.is-dragged-over-before::before {
      border-top: 1px solid var(--theme-caret-color);
    }
    &.column.is-dragged-over-after::before {
      border-bottom: 1px solid var(--theme-caret-color);
    }
    &.row.is-dragged-over-before::before {
      border-left: 1px solid var(--theme-caret-color);
    }
    &.row.is-dragged-over-after::before {
      border-right: 1px solid var(--theme-caret-color);
    }
  }
</style>
