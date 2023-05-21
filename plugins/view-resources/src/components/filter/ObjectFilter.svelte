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
  import core, { Doc, FindResult, getObjectValue, Ref, RefTo, SortingOrder, Space, Status } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import ui, {
    addNotification,
    Icon,
    IconCheck,
    IconSearch,
    deviceOptionsStore,
    Label,
    Loading,
    resizeObserver,
    EditWithIcon
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import view from '../../plugin'
  import { FILTER_DEBOUNCE_MS, sortFilterValues } from '../../filter'
  import { buildConfigLookup, getPresenter } from '../../utils'
  import FilterRemovedNotification from './FilterRemovedNotification.svelte'

  export let filter: Filter
  export let space: Ref<Space> | undefined = undefined
  export let onChange: (e: Filter) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const tkey = '$lookup.' + filter.key.key
  const key = { key: tkey }
  const lookup = buildConfigLookup(hierarchy, filter.key._class, [tkey])
  const promise = getPresenter(client, filter.key._class, key, key, lookup)
  filter.modes = filter.modes === undefined ? [view.filter.FilterObjectIn, view.filter.FilterObjectNin] : filter.modes
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  let values: (Doc | undefined | null)[] = []
  let objectsPromise: Promise<FindResult<Doc>> | undefined
  const targets = new Set<any>()
  $: targetClass = (filter.key.attribute.type as RefTo<Doc>).to
  $: clazz = hierarchy.getClass(targetClass)

  $: isStatus = client.getHierarchy().isDerived(targetClass, core.class.Status) ?? false

  let filterUpdateTimeout: number | undefined

  const groupValues = (val: Status[]): Doc[] => {
    const statuses = val
    const result: Doc[] = []
    const unique = [...new Set(val.map((v) => v.name.trim().toLocaleLowerCase()))]
    unique.forEach((label, i) => {
      let exists = false
      statuses.forEach((state) => {
        if (state.name.trim().toLocaleLowerCase() === label) {
          if (!exists) {
            result[i] = state
            exists = targets.has(state?._id)
          }
        }
      })
    })
    return result
  }

  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    targets.clear()

    const spaces = (
      await client.findAll(core.class.Space, { archived: true }, { projection: { _id: 1, archived: 1, _class: 1 } })
    ).map((it) => it._id)

    const baseObjects = await client.findAll(filter.key._class, space ? { space } : { space: { $nin: spaces } }, {
      projection: { [filter.key.key]: 1, space: 1 }
    })
    for (const object of baseObjects) {
      const value = getObjectValue(filter.key.key, object) ?? undefined
      targets.add(value)
    }
    for (const object of filter.value) {
      targets.add(object)
    }

    const resultQuery =
      search !== '' && clazz.sortingKey
        ? {
            [clazz.sortingKey]: { $like: '%' + search + '%' },
            _id: { $in: Array.from(targets.keys()) }
          }
        : {
            _id: { $in: Array.from(targets.keys()) }
          }
    const options = clazz.sortingKey !== undefined ? { sort: { [clazz.sortingKey]: SortingOrder.Ascending } } : {}
    objectsPromise = client.findAll(targetClass, resultQuery, options)
    values = await objectsPromise
    if (isStatus) {
      values = groupValues(values as Status[])
    }
    if (targets.has(undefined)) {
      values.unshift(undefined)
    }
    if (values.length !== targets.size) {
      const oldSize = filter.value.length
      const set = new Set(values.map((p) => p?._id))
      filter.value = filter.value.filter((p) => set.has(p))
      const removed = oldSize - (filter.value.length ?? 0)
      if (removed > 0) {
        onChange(filter)
        addNotification(await translate(view.string.FilterUpdated, {}), filter.key.label, FilterRemovedNotification, {
          description: await translate(view.string.FilterRemoved, { count: removed })
        })
      }
    }
    objectsPromise = undefined
  }

  function isSelected (value: Doc | undefined | null, values: any[]): boolean {
    return values.includes(value?._id ?? value)
  }

  function handleFilterToggle (value: any): void {
    if (isSelected(value, filter.value)) {
      filter.value = filter.value.filter((p) => (value ? p !== value._id : p != null))
    } else {
      if (value) {
        filter.value = [...filter.value, value._id]
      } else {
        filter.value = [...filter.value, undefined]
      }
    }

    updateFilter()
  }

  function updateFilter () {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => onChange(filter), FILTER_DEBOUNCE_MS)
  }

  let search: string = ''

  const dispatch = createEventDispatcher()
  $: if (targetClass) getValues(search)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  {#if clazz.sortingKey}
    <div class="header">
      <EditWithIcon
        icon={IconSearch}
        size={'large'}
        width={'100%'}
        focus={!$deviceOptionsStore.isMobile}
        bind:value={search}
        placeholder={presentation.string.Search}
        on:change={() => {
          getValues(search)
        }}
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
          {#each sortFilterValues(values, (v) => isSelected(v, filter.value)) as value}
            <button
              class="menu-item no-focus content-pointer-events-none"
              on:click={() => {
                handleFilterToggle(value)
              }}
            >
              <div class="flex-between w-full">
                <div class="flex-row-center">
                  {#if value}
                    {#key value._id}
                      <svelte:component this={attribute.presenter} {value} {...attribute.props} disabled oneLine />
                    {/key}
                  {:else}
                    <Label label={ui.string.NotSelected} />
                  {/if}
                </div>
                <div class="pointer-events-none">
                  {#if isSelected(value, filter.value)}
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
  <div class="menu-space" />
</div>
