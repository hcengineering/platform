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
  import {
    AggregateValue,
    Class,
    Doc,
    DocumentQuery,
    DocumentUpdate,
    FindOptions,
    Hierarchy,
    Lookup,
    PrimitiveType,
    RateLimitter,
    Ref,
    Space
  } from '@hcengineering/core'
  import { IntlString } from '@hcengineering/platform'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { DocWithRank, calcRank } from '@hcengineering/task'
  import {
    AnyComponent,
    AnySvelteComponent,
    ExpandCollapse,
    Spinner,
    getEventPositionElement,
    mouseAttractor,
    showPopup
  } from '@hcengineering/ui'
  import { AttributeModel, BuildModelKey, ViewOptionModel, ViewOptions, Viewlet } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { fade } from 'svelte/transition'
  import { FocusSelection, focusStore } from '../../selection'
  import Menu from '../Menu.svelte'
  import ListHeader from './ListHeader.svelte'
  import ListItem from './ListItem.svelte'

  export let category: PrimitiveType | AggregateValue
  export let headerComponent: AttributeModel | undefined
  export let singleCat: boolean
  export let oneCat: boolean
  export let lastCat: boolean
  export let groupByKey: string
  export let space: Ref<Space> | undefined
  export let baseMenuClass: Ref<Class<Doc>> | undefined
  export let itemProj: Doc[]
  export let docKeys: Partial<DocumentQuery<Doc>> = {}
  export let createItemDialog: AnyComponent | AnySvelteComponent | undefined
  export let createItemDialogProps: Record<string, any> | undefined
  export let createItemLabel: IntlString | undefined
  export let selectedObjectIds: Doc[]
  export let itemModels: Map<Ref<Class<Doc>>, AttributeModel[]>
  export let extraHeaders: AnyComponent[] | undefined
  export let flatHeaders = false
  export let disableHeader = false
  export let props: Record<string, any> = {}
  export let level: number
  export let lookup: Lookup<Doc>
  export let _class: Ref<Class<Doc>>
  export let config: (string | BuildModelKey)[]
  export let configurations: Record<Ref<Class<Doc>>, Viewlet['config']> | undefined
  export let configurationsVersion: number
  export let viewOptions: ViewOptions
  export let newObjectProps: (doc: Doc | undefined) => Record<string, any> | undefined
  export let viewOptionsConfig: ViewOptionModel[] | undefined
  export let dragItem: {
    doc?: Doc
    revert?: () => void
  }
  export let listDiv: HTMLDivElement
  export let index: number
  export let groupPersistKey: string
  export let compactMode: boolean = false
  export let resultQuery: DocumentQuery<Doc>
  export let resultOptions: FindOptions<Doc>
  export let parentCategories: number = 0
  export let limiter: RateLimitter

  $: lastLevel = level + 1 >= viewOptions.groupBy.length

  let items: Doc[] = []

  const docsQuery = createQuery()

  const autoFoldLimit = 20
  const defaultLimit = 20
  const singleCategoryLimit = 50
  $: initialLimit = !lastLevel ? undefined : singleCat ? singleCategoryLimit : defaultLimit
  $: limit = initialLimit

  $: if (lastLevel) {
    limiter.add(async () => {
      docsQuery.query(
        _class,
        { ...resultQuery, ...docKeys },
        (res) => {
          items = res
        },
        { ...resultOptions, limit: limit ?? 200 }
      )
    })
  } else {
    docsQuery.unsubscribe()
  }

  $: categoryCollapseKey = `list_collapsing_${location.pathname}_${groupPersistKey}`
  $: storedCollapseState = localStorage.getItem(categoryCollapseKey)

  $: collapsed = storedCollapseState === 'true' || storedCollapseState === null
  let wasLoaded = false

  const dispatch = createEventDispatcher()

  function limitGroup (items: Doc[], limit: number | undefined): Doc[] {
    const res = limit !== undefined ? items.slice(0, limit) : items
    return res
  }

  function initCollapsed (singleCat: boolean, lastLevel: boolean, level: number): void {
    if (localStorage.getItem(categoryCollapseKey) === null) {
      collapsed =
        (!disableHeader &&
          !singleCat &&
          itemProj.length > (lastLevel ? autoFoldLimit : singleCategoryLimit) / (level + 1)) ||
        parentCategories > 10 ||
        (level > 1 && parentCategories > 5)
    }
  }

  $: initCollapsed(singleCat, lastLevel, level)

  const handleRowFocused = (object: Doc) => {
    dispatch('row-focus', object)
  }

  const handleMenuOpened = async (event: MouseEvent, object: Doc) => {
    event.preventDefault()
    handleRowFocused(object)

    if (!selectedObjectIdsSet.has(object._id)) {
      dispatch('uncheckAll')
    }

    const items = selectedObjectIds.length > 0 ? selectedObjectIds : object

    showPopup(Menu, { object: items, baseMenuClass }, getEventPositionElement(event))
  }

  let limited: Doc[] = []

  let loading = false
  let loadingTimeout: any | undefined = undefined

  function update (items: Doc[], limit: number | undefined, index: number): void {
    clearTimeout(loadingTimeout)
    if (limited.length > 0 || index * 2 === 0) {
      limited = limitGroup(items, limit)
    } else {
      loading = true
      loadingTimeout = setTimeout(() => {
        limited = limitGroup(items, limit)
        loading = false
      }, index * 2)
    }
  }

  $: update(items, limit, index)

  $: selectedObjectIdsSet = new Set<Ref<Doc>>(selectedObjectIds.map((it) => it._id))

  $: _newObjectProps = (doc: Doc | undefined): Record<string, any> | undefined => {
    const groupValue =
      typeof category === 'object' ? category.values.find((it) => it.space === doc?.space)?._id : category

    return {
      ...newObjectProps(doc),
      ...(doc ? { space: doc.space } : {}),
      ...(groupValue !== undefined ? { [groupByKey]: groupValue } : {})
    }
  }

  function isSelected (doc: Doc, focusStore: FocusSelection): boolean {
    return focusStore.focus?._id === doc._id
  }

  $: byRank = viewOptions.orderBy?.[0] === 'rank'

  const client = getClient()

  let dragItemIndex: number | undefined

  function dragswap (ev: MouseEvent, i: number): boolean {
    if (dragItemIndex === undefined || !byRank) return false
    const s = dragItemIndex
    if (i < s) {
      return ev.offsetY < (ev.target as HTMLElement).offsetHeight / 2
    } else if (i > s) {
      return ev.offsetY > (ev.target as HTMLElement).offsetHeight / 2
    }
    return false
  }

  function dragOverCat (ev: MouseEvent) {
    ev.preventDefault()
    ev.stopPropagation()
  }

  let div: HTMLDivElement

  function isBorder (ev: MouseEvent, direction: 'top' | 'bottom'): boolean {
    const target = ev.target as HTMLDivElement
    return Math.abs(ev.clientY - target.getBoundingClientRect()[direction]) < 5
  }

  function dragEnterCat (ev: MouseEvent) {
    ev.preventDefault()
    if (dragItemIndex === undefined && dragItem.doc !== undefined) {
      const index = items.findIndex((p) => p._id === dragItem.doc?._id)
      if (index !== -1) {
        dragItemIndex = index
        return
      }
      const props = _newObjectProps(dragItem.doc)
      if (props !== undefined) {
        if (isBorder(ev, 'top')) {
          items.unshift(dragItem.doc)
          dragItemIndex = 0
          items = items
          dispatch('row-focus', dragItem)
        } else if (isBorder(ev, 'bottom')) {
          items.push(dragItem.doc)
          dragItemIndex = items.length - 1
          items = items
          dispatch('row-focus', dragItem)
        }
      }
    }
  }

  function dragLeaveCat (ev: MouseEvent) {
    ev.stopPropagation()
    if (dragItemIndex !== undefined) {
      items.splice(dragItemIndex, 1)
      items = items
      dragItemIndex = undefined
    }
  }

  function dragItemLeave (ev: MouseEvent, i: number) {
    if (dragItemIndex !== undefined) {
      const isLastItem = i === limited.length - 1
      const isFirstItemWithoutHeader = i === 0 && disableHeader
      if (isFirstItemWithoutHeader && isBorder(ev, 'top')) {
        return
      }
      if (isLastItem && isBorder(ev, 'bottom')) {
        return
      }
      ev.stopPropagation()
      ev.preventDefault()
    }
  }

  function dragover (ev: MouseEvent, i: number) {
    if (dragItemIndex === undefined || !lastLevel) return
    ev.preventDefault()
    ev.stopPropagation()
    const s = dragItemIndex
    if (dragswap(ev, i) && items[i] !== undefined && items[s] !== undefined) {
      ;[items[i], items[s]] = [items[s], items[i]]
      items = items
      dragItemIndex = i
      dispatch('row-focus', dragItem)
    }
  }

  function dropItemHandle (ev: MouseEvent) {
    ev.stopPropagation()
    ev.preventDefault()
    const update: DocumentUpdate<Doc> = {}
    if (dragItemIndex !== undefined && viewOptions.orderBy?.[0] === 'rank') {
      const prev = limited[dragItemIndex - 1] as DocWithRank
      const next = limited[dragItemIndex + 1] as DocWithRank
      try {
        const newRank = calcRank(prev, next)
        if ((dragItem.doc as DocWithRank)?.rank !== newRank) {
          ;(update as any).rank = newRank
        }
      } catch {}
    }
    drop(update)
  }

  async function drop (update: DocumentUpdate<Doc> = {}) {
    if (dragItem.doc !== undefined) {
      const props = _newObjectProps(dragItem.doc)
      if (props !== undefined) {
        for (const key in props) {
          const value = props[key]
          if ((dragItem.doc as any)[key] !== value) {
            ;(update as any)[key] = value
          }
        }
        if (Object.keys(update).length > 0) {
          await client.update(dragItem.doc, update)
        }
      } else {
        dragItem.revert?.()
      }
    }
    dragItem.doc = undefined
    dragItem.revert = undefined
    dragItemIndex = undefined
  }

  const dragEndListener: any = (ev: DragEvent, initIndex: number) => {
    ev.preventDefault()
    const rect = listDiv.getBoundingClientRect()
    const inRect = ev.clientY > rect.top && ev.clientY < rect.top + rect.height
    if (!inRect) {
      if (items.findIndex((p) => p._id === dragItem.doc?._id) === -1 && dragItem.doc !== undefined) {
        items = [...items.slice(0, initIndex), dragItem.doc, ...items.slice(initIndex)]
      }
      if (level === 0) {
        dragItem.doc = undefined
        dragItem.revert = undefined
      }
    }
  }

  function dragStartHandler (e: CustomEvent<any>) {
    const { target, index } = e.detail
    dragItemIndex = index
    ;(target as EventTarget).addEventListener('dragend', (e) => dragEndListener(e, index))
  }

  function dragStart (ev: DragEvent, docObject: Doc, i: number) {
    if (ev.dataTransfer) {
      ev.dataTransfer.effectAllowed = 'move'
      ev.dataTransfer.dropEffect = 'move'
    }
    ev.target?.addEventListener('dragend', (e) => dragEndListener(e, i))
    dragItem = {
      doc: docObject,
      revert: () => {
        const d = items.find((it) => it._id === docObject._id)
        if (d === undefined) {
          items.splice(i, 0, docObject)
          items = items
        }
      }
    }
    dragItemIndex = i
    dispatch('dragstart', {
      target: ev.target,
      index: i
    })
  }
  export function expand (): void {
    collapsed = false
    localStorage.setItem(categoryCollapseKey, 'false')
  }
  export function scroll (item: Doc): void {
    const pos = limited.findIndex((it) => it._id === item._id)
    if (pos >= 0) {
      if (collapsed) {
        collapsed = false
        localStorage.setItem(categoryCollapseKey, 'false')
        setTimeout(() => scroll(item), 50)
      } else {
        listItems[pos]?.scroll()
      }
    }
  }

  export function getLimited (): Doc[] {
    return limited
  }

  const listItems: ListItem[] = []

  function getDocItemModel (docClass: Ref<Class<Doc>>): AttributeModel[] {
    let res = itemModels.get(docClass)
    if (res) {
      return res
    }

    try {
      for (const ac of client.getHierarchy().getAncestors(docClass)) {
        res = itemModels.get(ac)

        if (res) {
          return res
        }
      }
    } catch (e) {
      // suppress
    }

    return []
  }
</script>

<div
  in:fade|local={{ duration: 50 }}
  bind:this={div}
  class="category-container"
  class:zero-container={level === 0}
  on:drop|preventDefault={drop}
  on:dragover={dragOverCat}
  on:dragenter={dragEnterCat}
  on:dragleave={dragLeaveCat}
>
  {#if !disableHeader}
    <ListHeader
      {groupByKey}
      {category}
      {space}
      {level}
      limited={lastLevel ? limited.length : itemProj.length}
      itemsProj={itemProj}
      items={limited}
      {headerComponent}
      {createItemDialog}
      {createItemDialogProps}
      {createItemLabel}
      {extraHeaders}
      newObjectProps={_newObjectProps}
      flat={flatHeaders}
      {collapsed}
      {props}
      {lastCat}
      {viewOptions}
      on:more={() => {
        if (limit !== undefined) limit += 20
      }}
      on:collapse={() => {
        collapsed = !collapsed
        if (collapsed) {
          if ($focusStore.focus !== undefined) {
            const fid = $focusStore.focus._id
            if (items.some((it) => it._id === fid)) {
              $focusStore = { provider: $focusStore.provider }
            }
          }
          dispatch('collapsed', { div })
        }
        localStorage.setItem(categoryCollapseKey, collapsed ? 'true' : 'false')
      }}
    />
  {/if}
  <ExpandCollapse isExpanded={!collapsed || dragItemIndex !== undefined}>
    {#if !lastLevel}
      <slot
        name="category"
        docs={itemProj}
        {_class}
        {space}
        {lookup}
        {baseMenuClass}
        {config}
        {configurations}
        {selectedObjectIds}
        {createItemDialog}
        {createItemLabel}
        {viewOptions}
        {docKeys}
        newObjectProps={_newObjectProps}
        {flatHeaders}
        {props}
        level={level + 1}
        {groupPersistKey}
        {viewOptionsConfig}
        {listDiv}
        dragItem
        dragstart={dragStartHandler}
      />
    {:else if itemModels && itemModels.size > 0 && (!collapsed || wasLoaded || dragItemIndex !== undefined)}
      {#if limited && !loading}
        {#key configurationsVersion}
          {#each limited as docObject, i (docObject._id)}
            <ListItem
              bind:this={listItems[i]}
              {docObject}
              model={getDocItemModel(Hierarchy.mixinOrClass(docObject))}
              {groupByKey}
              selected={isSelected(docObject, $focusStore)}
              checked={selectedObjectIdsSet.has(docObject._id)}
              last={i === limited.length - 1}
              lastCat={i === limited.length - 1 && (oneCat || lastCat)}
              on:dragstart={(e) => dragStart(e, docObject, i)}
              on:dragenter={(e) => {
                if (dragItemIndex !== undefined) {
                  e.stopPropagation()
                  e.preventDefault()
                }
              }}
              on:dragleave={(e) => dragItemLeave(e, i)}
              on:dragover={(e) => dragover(e, i)}
              on:drop={dropItemHandle}
              on:check={(ev) => dispatch('check', { docs: ev.detail.docs, value: ev.detail.value })}
              on:contextmenu={(event) => handleMenuOpened(event, docObject)}
              on:focus={() => {}}
              on:mouseover={mouseAttractor(() => handleRowFocused(docObject))}
              on:mouseenter={mouseAttractor(() => handleRowFocused(docObject))}
              {props}
              {compactMode}
              on:on-mount={() => {
                wasLoaded = true
              }}
            />
          {/each}
        {/key}
      {/if}
    {:else if loading}
      <Spinner size="small" />
    {/if}
  </ExpandCollapse>
</div>

<style lang="scss">
  .zero-container {
    border-radius: 0.25rem;

    &:not(:first-child) {
      margin-top: 0.5rem;
    }
  }
</style>
