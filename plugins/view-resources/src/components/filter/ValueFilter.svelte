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
  import core, {
    Class,
    Doc,
    FindResult,
    getObjectValue,
    Ref,
    SortingOrder,
    Space,
    type WithLookup
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
  import { Filter, ViewOptions } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FILTER_DEBOUNCE_MS, sortFilterValues } from '../../filter'
  import view from '../../plugin'
  import { getPresenter } from '../../utils'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void
  export let viewOptions: ViewOptions | undefined = undefined

  filter.modes = [view.filter.FilterValueIn, view.filter.FilterValueNin]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  $: isSearchable = [core.class.TypeNumber, core.class.EnumOf].includes(filter.key.attribute.type._class)

  const client = getClient()
  const key = { key: filter.key.key }
  const promise = getPresenter(client, filter.key._class, key, key)

  let values = new Set<any>()
  let sortedValues: any[] = []
  let selectedValues: Set<any> = new Set<any>(filter.value.map((p) => p[0]))
  const realValues = new Map<any, Set<any>>()

  let objectsPromise: Promise<FindResult<Doc>> | undefined

  let filterUpdateTimeout: any | undefined

  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    values.clear()
    realValues.clear()
    let prefix = ''
    const hierarchy = client.getHierarchy()
    const attr = hierarchy.getAttribute(filter.key._class, filter.key.key)
    if (hierarchy.isMixin(attr.attributeOf)) {
      prefix = attr.attributeOf + '.'
    }
    const resultQuery =
      isSearchable && search !== ''
        ? {
            [prefix + filter.key.key]: { $like: '%' + search + '%' }
          }
        : {}
    const isDerivedFromSpace = hierarchy.isDerived(_class, core.class.Space)

    async function doQuery (limit: number | undefined, sortedValues: any[] | undefined): Promise<boolean> {
      const p = client.findAll(
        _class,
        {
          ...resultQuery,
          ...(space !== undefined
            ? { space }
            : isDerivedFromSpace
              ? viewOptions === undefined || viewOptions?.hideArchived === true
                ? { archived: false }
                : {}
              : {}),
          ...(sortedValues !== undefined ? { [prefix + filter.key.key]: { $nin: sortedValues } } : {})
        },
        {
          sort: { modifiedOn: SortingOrder.Descending },
          projection: { [prefix + filter.key.key]: 1, space: 1 },
          ...(limit !== undefined ? { limit } : {}),
          lookup: {
            space: core.class.Space
          }
        }
      )
      if (limit !== undefined) {
        objectsPromise = p
      }
      let res: WithLookup<Doc>[] = await p
      // We need to filter archived in case it is required

      const len = res.length
      if (space === undefined || !isDerivedFromSpace) {
        res = res.filter((it) => !(it.$lookup?.space?.archived ?? false))
      }

      for (const object of res) {
        let asDoc = object
        if (hierarchy.isMixin(filter.key._class)) {
          asDoc = hierarchy.as(object, filter.key._class)
        }
        const realValue = getObjectValue(filter.key.key, asDoc)
        const value = getValue(realValue)
        values.add(value)
        realValues.set(value, (realValues.get(value) ?? new Set()).add(realValue))
      }
      for (const object of filter.value.map((p) => p[0])) {
        values.add(object)
      }
      return len >= (limit ?? 0)
    }
    const hasMore = await doQuery(1000, undefined)
    values = values
    sortedValues = sortFilterValues([...values.keys()], (v) => isSelected(v, selectedValues))
    objectsPromise = undefined

    // Check if we have all possible values, in case of enumeration
    if (hasMore) {
      await doQuery(undefined, Array.from(values))
      sortedValues = sortFilterValues([...values.keys()], (v) => isSelected(v, selectedValues))
      objectsPromise = undefined
    }
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
  {#if isSearchable}
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
  {:else}
    <div class="menu-space" />
  {/if}
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#if objectsPromise}
          <Loading />
        {:else}
          {#each sortedValues as value}
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
