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
  import core, {
    ArrOf,
    Class,
    Doc,
    EnumOf,
    FindResult,
    getObjectValue,
    Ref,
    SortingOrder,
    Space
  } from '@hcengineering/core'
  import presentation, { getClient } from '@hcengineering/presentation'
  import ui, {
    deviceOptionsStore,
    EditWithIcon,
    Icon,
    IconCheck,
    IconSearch,
    Label,
    Loading,
    resizeObserver
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FILTER_DEBOUNCE_MS } from '../../filter'
  import view from '../../plugin'
  import { getPresenter } from '../../utils'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = [view.filter.FilterArrayAll, view.filter.FilterArrayAny]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  const client = getClient()
  const key = { key: filter.key.key }
  const promise = getPresenter(client, filter.key._class, key, key)

  let values = new Set<any>()
  let selectedValues: Set<any> = new Set<any>(filter.value.map((p) => p[0]))
  const realValues = new Map<any, Set<any>>()

  let objectsPromise: Promise<FindResult<Doc>> | undefined

  let filterUpdateTimeout: any | undefined

  async function getEnumValues (search: string): Promise<void> {
    const enumId = ((filter.key.attribute.type as ArrOf<Doc>).of as EnumOf).of
    const enumVal = await client.findOne(core.class.Enum, { _id: enumId })
    if (enumVal !== undefined) {
      for (const realValue of enumVal.enumValues) {
        const value = getValue(realValue) as string
        if (search !== '' && !value.includes(search.toUpperCase())) continue
        values.add(value)
        realValues.set(value, (realValues.get(value) ?? new Set()).add(realValue))
      }
      values = values
    }
  }

  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    objectsPromise = undefined
    values.clear()
    realValues.clear()
    if ((filter.key.attribute.type as ArrOf<Doc>).of._class === core.class.EnumOf) {
      return getEnumValues(search)
    }
    const resultQuery =
      search !== ''
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
      const arr = getObjectValue(filter.key.key, asDoc)
      if (!Array.isArray(arr)) continue
      for (const realValue of arr) {
        const value = getValue(realValue)
        values.add(value)
        realValues.set(value, (realValues.get(value) ?? new Set()).add(realValue))
      }
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

  const dispatch = createEventDispatcher()

  $: getValues(search)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={search}
      placeholder={presentation.string.Search}
    />
  </div>
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#if objectsPromise}
          <Loading />
        {:else}
          {#each [...values.keys()] as value}
            {@const realValue = [...(realValues.get(value) ?? [])][0]}
            <button
              class="menu-item no-focus content-pointer-events-none"
              on:click={() => {
                handleFilterToggle(value)
              }}
            >
              {#if value !== undefined}
                <div class="clear-mins flex-grow">
                  <svelte:component
                    this={attribute.presenter}
                    value={typeof value === 'string' ? realValue : value}
                    {...attribute.props}
                    oneLine
                  />
                </div>
              {:else}
                <span class="overflow-label flex-grow"><Label label={ui.string.NotSelected} /></span>
              {/if}
              <div class="check pointer-events-none">
                {#if isSelected(value, selectedValues)}
                  <Icon icon={IconCheck} size={'small'} />
                {/if}
              </div>
            </button>
          {/each}
        {/if}
      {/await}
    </div>
  </div>
  <div class="menu-space" />
</div>
