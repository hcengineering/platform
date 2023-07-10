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
  import { Class, Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { TagCategory, TagElement } from '@hcengineering/tags'
  import { Button, getPlatformColorForTextDef, showPopup, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tags from '../plugin'
  import { getTagStyle } from '../utils'
  import TagsCategoryPopup from './TagsCategoryPopup.svelte'

  export let targetClass: Ref<Class<Doc>>
  export let category: Ref<TagCategory> | undefined = undefined
  export let selected: Ref<TagElement>[] = []
  export let gap: 'small' | 'big' = 'small'
  export let mode: 'item' | 'category' = 'category'

  let categories: TagCategory[] = []
  let visibleCategories: TagCategory[] = []

  const stepStyle = gap === 'small' ? 'gap-1' : 'gap-2'

  const dispatch = createEventDispatcher()

  let elements: TagElement[] = []

  let categoryCounts = new Map<Ref<TagCategory>, TagElement[]>()
  let categoryKeys: Ref<TagCategory>[] = []

  const elementsQuery = createQuery()
  $: if (tagElements !== undefined && tagElements.size > 0) {
    elementsQuery.query(
      tags.class.TagElement,
      { _id: { $in: Array.from(tagElements?.keys()) }, targetClass },
      (res) => {
        elements = res
      },
      {
        sort: {
          title: SortingOrder.Ascending
        }
      }
    )
  } else {
    elementsQuery.unsubscribe()
  }

  type TagElementInfo = { count: number; modifiedOn: number }
  let tagElements: Map<Ref<TagElement>, TagElementInfo> | undefined = undefined
  const refQuery = createQuery()
  $: refQuery.query(
    tags.class.TagReference,
    {},
    (res) => {
      const result = new Map<Ref<TagElement>, TagElementInfo>()

      for (const d of res) {
        const v = result.get(d.tag) ?? { count: 0, modifiedOn: 0 }
        v.count++
        v.modifiedOn = Math.max(v.modifiedOn, d.modifiedOn)
        result.set(d.tag, v)
      }

      tagElements = result
    },
    {
      projection: {
        _id: 1,
        tag: 1
      }
    }
  )

  $: {
    const counts = new Map<Ref<TagCategory>, TagElement[]>()
    for (const e of elements) {
      if (e.category !== undefined) {
        if (selected.includes(e._id) && category === undefined) {
          category = e.category
        }
        const els = counts.get(e.category) ?? []
        els.push(e)
        counts.set(e.category, els)
      }
    }
    categoryCounts = counts
    categoryKeys = Array.from(categoryCounts.keys())
  }

  const categoriesQuery = createQuery()
  $: categoriesQuery.query(
    tags.class.TagCategory,
    {},
    (res) => {
      categories = res
    },
    { sort: { label: SortingOrder.Ascending } }
  )

  $: visibleCategories = categories.filter((it) => categoryKeys.includes(it._id))

  const selectItem = (item: TagCategory): void => {
    if (category === item._id) {
      category = undefined
    } else {
      category = item._id
    }
    selected = (category !== undefined ? categoryCounts.get(category) ?? [] : []).map((it) => it._id)
    dispatch('change', { category, elements: selected })
  }

  function selectTag (evt: Event, category: TagCategory): void {
    showPopup(
      TagsCategoryPopup,
      {
        category,
        targetClass,
        selected,
        keyLabel: category.label,
        hideAdd: true
      },
      evt.target as HTMLElement,
      (result) => {
        if (result !== undefined) {
          selected = result.map((it: TagElement) => it._id)
          dispatch('change', { category: category._id, elements: result })
        }
      }
    )
  }
  const visibleCategoriesRef: HTMLElement[] = []

  $: visibleCategoriesRef.length = visibleCategories.length

  $: if (category !== undefined && visibleCategories.length > 0 && visibleCategoriesRef.length > 0) {
    const idx = visibleCategories.findIndex((it) => it._id === category)
    if (idx !== -1) {
      visibleCategoriesRef[idx]?.scrollIntoView({ block: 'nearest' })
    }
  }
</script>

{#if visibleCategories.length > 0}
  <div class="ac-header full divide">
    <div class="buttons-group small-gap">
      <Button
        label={tags.string.AllCategories}
        kind={'ghost'}
        size={'large'}
        on:click={() => {
          category = undefined
          dispatch('change', { category, elements: [] })
        }}
      />
    </div>
    <div class="flex-row-center caption-color states">
      <div class="antiStatesBar mask-none {stepStyle}">
        {#each visibleCategories as item, i}
          {@const color = getPlatformColorForTextDef(item.label, $themeStore.dark)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <div
            bind:this={visibleCategoriesRef[i]}
            class="categoryElement flex-center"
            id={item.label}
            style={getTagStyle(color, item._id === category)}
            on:click={(evt) => {
              if (mode === 'category') {
                selectItem(item)
              } else {
                selectTag(evt, item)
              }
            }}
          >
            {item.label}
            {#if item._id === category && mode === 'item'}
              ({selected.length}/{categoryCounts.get(item._id)?.length ?? ''})
            {:else}
              ({categoryCounts.get(item._id)?.length ?? ''})
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .categoryElement {
    padding: 0.375rem 0.75rem;
    // height: 2.5rem;
    white-space: nowrap;
    border: 1px solid var(--divider-color);
    border-radius: 0.25rem;
    cursor: pointer;
  }
  .categoryElement + .categoryElement {
    margin-left: 0.125rem;
  }
</style>
