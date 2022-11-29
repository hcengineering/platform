<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { Ref, RelatedDocument } from '@hcengineering/core'

  import { getResource, IntlString } from '@hcengineering/platform'
  import ui, {
    Button,
    createFocusManager,
    EditBox,
    FocusHandler,
    IconSearch,
    Label,
    ListView,
    resizeObserver
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import presentation from '../plugin'
  import { ObjectSearchCategory, ObjectSearchResult } from '../types'
  import { getClient } from '../utils'

  export let query: string = ''
  export let label: IntlString | undefined = undefined
  export let relatedDocuments: RelatedDocument[] | undefined = undefined
  export let ignore: RelatedDocument[] | undefined = undefined

  let items: ObjectSearchResult[] = []

  let categories: ObjectSearchCategory[] = []
  let categoryStatus: Record<Ref<ObjectSearchCategory>, number> = {}
  const client = getClient()

  let category: ObjectSearchCategory | undefined
  client.findAll(presentation.class.ObjectSearchCategory, {}).then((r) => {
    categories = r
    category = categories[0]
  })

  const dispatch = createEventDispatcher()

  let list: ListView
  let selection = 0

  function dispatchItem (item: ObjectSearchResult): void {
    dispatch('close', item)
  }

  export function onKeyDown (key: KeyboardEvent): boolean {
    if (key.key === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
      return true
    }
    if (key.key === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.key === 'Tab') {
      key.stopPropagation()
      key.preventDefault()
      const visibleCategory = categories.filter((it) => (categoryStatus[it._id] ?? 0) > 0)
      const pos = category !== undefined ? visibleCategory.findIndex((it) => it._id === category?._id) : -1
      if (pos >= 0) {
        category = visibleCategory[(pos + 1) % visibleCategory.length]
        return true
      }
    }
    if (key.key === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      const item = items[selection]
      if (item) {
        dispatchItem(item)
        return true
      } else {
        return false
      }
    }
    return false
  }

  export function done () {}

  async function updateItems (
    cat: ObjectSearchCategory | undefined,
    query: string,
    relatedDocuments?: RelatedDocument[]
  ): Promise<void> {
    if (cat === undefined) {
      return
    }

    const newCategoryStatus: Record<Ref<ObjectSearchCategory>, number> = {}
    const f = await getResource(cat.query)

    const result = await f(client, query, { in: relatedDocuments, nin: ignore })
    // We need to sure, results we return is for proper category.
    if (cat._id === category?._id) {
      items = result
      if (selection > items.length) {
        selection = 0
      }
      newCategoryStatus[cat._id] = result.length
    }

    // Automatic try next category and show available items if so
    for (const c of categories) {
      if (c._id !== cat._id) {
        const ff = await getResource(c.query)
        const cresult = await ff(client, query, { in: relatedDocuments, nin: ignore })
        newCategoryStatus[c._id] = cresult.length
      }
    }
    categoryStatus = newCategoryStatus
  }
  $: updateItems(category, query, relatedDocuments)

  $: if (items.length === 0) {
    for (const c of categories) {
      if ((categoryStatus[c._id] ?? 0) > 0) {
        category = c
        break
      }
    }
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<form class="antiCard dialog completion" on:keydown={onKeyDown} use:resizeObserver={() => dispatch('changeSize')}>
  <div class="header-dialog">
    {#if label}
      <div class="fs-title flex-grow mb-4">
        <Label {label} />
      </div>
    {/if}
    <div class="flex-row-center gap-1">
      {#each categories as c, i}
        {@const status = categoryStatus[c._id] ?? 0}
        <div class="ap-categoryItem">
          <Button
            focusIndex={i + 1}
            kind={'transparent'}
            showTooltip={{ label: c.label }}
            selected={category?._id === c._id}
            icon={c.icon}
            size={'x-large'}
            disabled={status === 0}
            on:click={() => {
              category = c
            }}
          />
        </div>
      {/each}
    </div>
    <EditBox
      focus
      icon={IconSearch}
      kind={'search-style'}
      focusIndex={0}
      bind:value={query}
      on:input={() => updateItems(category, query, relatedDocuments)}
      placeholder={category?.label}
    />
    <Label label={ui.string.Suggested} />
  </div>
  <div class="antiCard-content min-h-60 max-h-60">
    <ListView bind:this={list} bind:selection count={items.length}>
      <svelte:fragment slot="item" let:item>
        {@const doc = items[item]}

        <div class="p-1 cursor-pointer" on:click={() => dispatchItem(doc)}>
          <svelte:component this={doc.component} value={doc.doc} {...doc.componentProps ?? {}} />
        </div>
      </svelte:fragment>
    </ListView>
  </div>
  <div class="antiCard-footer reverse">
    <div class="buttons-group text-sm flex-no-shrink">
      <Button label={presentation.string.Cancel} on:click={() => dispatch('close')} />
    </div>
  </div>
</form>

<style lang="scss">
  .header-dialog {
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    padding: 1.125rem 1.125rem 0;
    min-width: 0;
    min-height: 0;
  }
  .completion {
    z-index: 2000;
  }
</style>
