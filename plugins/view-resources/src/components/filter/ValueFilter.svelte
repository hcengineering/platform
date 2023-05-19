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
  import core, { Class, Doc, FindResult, getObjectValue, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import ui, { Icon, IconCheck, Label, Loading, resizeObserver, deviceOptionsStore } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { onMount, createEventDispatcher } from 'svelte'
  import { getPresenter } from '../../utils'
  import { FILTER_DEBOUNCE_MS, sortFilterValues } from '../../filter'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = [view.filter.FilterValueIn, view.filter.FilterValueNin]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  $: isSearchable = [core.class.TypeNumber, core.class.EnumOf].includes(filter.key.attribute.type._class)

  const client = getClient()
  const key = { key: filter.key.key }
  const promise = getPresenter(client, filter.key._class, key, key)

  let values = new Set<any>()
  let selectedValues: Set<any> = new Set<any>(filter.value.map((p) => p[0]))
  const realValues = new Map<any, Set<any>>()

  let objectsPromise: Promise<FindResult<Doc>> | undefined

  let filterUpdateTimeout: number | undefined

  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    values.clear()
    realValues.clear()
    const resultQuery =
      isSearchable && search !== ''
        ? {
            [filter.key.key]: { $like: '%' + search + '%' }
          }
        : {}
    let prefix = ''
    const hieararchy = client.getHierarchy()
    const attr = hieararchy.getAttribute(filter.key._class, filter.key.key)
    if (hieararchy.isMixin(attr.attributeOf)) {
      prefix = attr.attributeOf + '.'
    }
    objectsPromise = client.findAll(
      _class,
      { ...resultQuery, ...(space ? { space } : {}) },
      {
        sort: { [filter.key.key]: SortingOrder.Ascending },
        projection: { [prefix + filter.key.key]: 1, space: 1 }
      }
    )
    const res = await objectsPromise

    for (const object of res) {
      let asDoc = object
      if (hieararchy.isMixin(filter.key._class)) {
        asDoc = hieararchy.as(object, filter.key._class)
      }
      const realValue = getObjectValue(filter.key.key, asDoc)
      const value = getValue(realValue)
      values.add(value)
      realValues.set(value, (realValues.get(value) ?? new Set()).add(realValue))
    }
    for (const object of filter.value.map((p) => p[0])) {
      values.add(object)
    }
    values = values
    objectsPromise = undefined
  }

  function getValue (obj: any): any {
    if (typeof obj === 'string') {
      const trim = obj.trim()
      return trim.length > 0 ? trim.toUpperCase() : undefined
    } else {
      return obj ?? undefined
    }
  }

  function isSelected (value: any, values: Set<any>): boolean {
    return values.has(value)
  }

  function handleFilterToggle (value: any): void {
    if (isSelected(value, selectedValues)) {
      selectedValues.delete(value)
    } else {
      selectedValues.add(value)
    }
    selectedValues = selectedValues

    updateFilter(selectedValues)
  }

  function updateFilter (newValues: Set<any>) {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      filter.value = [...newValues.values()].map((v) => {
        return [v, [...(realValues.get(v) ?? [])]]
      })

      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  const dispatch = createEventDispatcher()

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })

  getValues(search)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  {#if isSearchable}
    <div class="header">
      <input
        bind:this={searchInput}
        type="text"
        bind:value={search}
        on:change={() => {
          getValues(search)
        }}
        placeholder={phTraslate}
      />
    </div>
  {/if}
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#if objectsPromise}
          <Loading />
        {:else}
          {#each sortFilterValues([...values.keys()], (v) => isSelected(v, selectedValues)) as value}
            {@const realValue = [...(realValues.get(value) ?? [])][0]}
            <button
              class="menu-item no-focus"
              on:click={() => {
                handleFilterToggle(value)
              }}
            >
              <div class="flex-between w-full">
                <div class="flex-row-center">
                  {#if value !== undefined}
                    <svelte:component
                      this={attribute.presenter}
                      value={typeof value === 'string' ? realValue : value}
                      {...attribute.props}
                      oneLine
                    />
                  {:else}
                    <Label label={ui.string.NotSelected} />
                  {/if}
                </div>
                <div class="pointer-events-none">
                  {#if isSelected(value, selectedValues)}
                    <Icon icon={IconCheck} size={'small'} />
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        {/if}
      {/await}
    </div>
  </div>
</div>
