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
  import { Class, Doc, Ref, SortingOrder } from '@anticrm/core'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { TagCategory, TagElement } from '@anticrm/tags'
  import tags from '../plugin'
  import { getPlatformColorForText, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import { getTagStyle } from '../utils'

  export let targetClass: Ref<Class<Doc>>
  export let category: Ref<TagCategory> | undefined = undefined
  export let gap: 'small' | 'big' = 'small'

  let categories: TagCategory[] = []
  let visibleCategories: TagCategory[] = []

  const stepStyle = gap === 'small' ? 'gap-1' : 'gap-2'

  const dispatch = createEventDispatcher()
  const client = getClient()

  let elements: TagElement[] = []

  let categoryCounts = new Map<Ref<TagCategory>, TagElement[]>()
  let categoryKeys: Ref<TagCategory>[] = []

  const elementsQuery = createQuery()
  $: elementsQuery.query(
    tags.class.TagElement,
    { targetClass: { $in: [targetClass, ...client.getHierarchy().getAncestors(targetClass)] } },
    (res) => {
      elements = res
    },
    {
      sort: {
        title: SortingOrder.Ascending
      }
    }
  )

  $: {
    const counts = new Map<Ref<TagCategory>, TagElement[]>()
    for (const e of elements) {
      if (e.category !== undefined) {
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

  const selectItem = (ev: Event, item: TagCategory): void => {
    if (category === item._id) {
      category = undefined
    } else {
      category = item._id
    }
    dispatch('change', { category, elements: category !== undefined ? categoryCounts.get(category) ?? [] : [] })
  }
</script>

{#if visibleCategories.length > 0}
  <div class="flex-between mb-4 header">
    <div class="flex-row-center buttons">
      <div
        class="button flex-center"
        class:active={category === undefined}
        on:click={() => {
          category = undefined
          dispatch('change', { category, elements: [] })
        }}
      >
        <Label label={tags.string.AllCategories} />
      </div>
    </div>
    <div class="flex-row-center caption-color states">
      <div class="antiStatesBar mask-none {stepStyle}">
        {#each visibleCategories as item, i (item._id)}
          <div
            class="categoryElement flex-center"
            label={item.label}
            style={getTagStyle(getPlatformColorForText(item.label), item._id === category)}
            on:click={(ev) => {
              if (item._id !== category) selectItem(ev, item)
            }}
          >
            {item.label} ({categoryCounts.get(item._id)?.length ?? ''})
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .categoryElement {
    padding: 0.5rem 0.75rem;
    height: 2.5rem;
    white-space: nowrap;
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.5rem;
    cursor: pointer;
  }
  .categoryElement + .categoryElement {
    margin-left: 0.75rem;
  }

  .header {
    margin-left: 2.5rem;
    margin-right: 1.75rem;
    .buttons {
      padding: 0.125rem 0;
    }
    .states {
      max-width: 75%;
    }

    .button {
      height: 2.5rem;
      padding: 0.5rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 0.5rem;
      cursor: pointer;

      &:hover {
        background-color: var(--theme-button-bg-enabled);
        border-color: var(--theme-button-border-enabled);
      }
      &.active {
        background-color: var(--theme-button-bg-enabled);
        color: var(--theme-caption-color);
        border-color: var(--theme-button-border-enabled);
      }
    }
  }
</style>
