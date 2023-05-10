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
    Button,
    Icon,
    IconCheck,
    deviceOptionsStore,
    Label,
    Loading,
    resizeObserver
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { createEventDispatcher, onMount } from 'svelte'
  import view from '../../plugin'
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
  const targets = new Map<any, number>()
  $: targetClass = (filter.key.attribute.type as RefTo<Doc>).to
  $: clazz = hierarchy.getClass(targetClass)

  $: isStatus = client.getHierarchy().isDerived(targetClass, core.class.Status) ?? false
  let statusesCount: Record<string, number> = {}

  const groupValues = (val: Status[]): Doc[] => {
    const statuses = val
    const result: Doc[] = []
    statusesCount = {}
    const unique = [...new Set(val.map((v) => v.name.trim().toLocaleLowerCase()))]
    unique.forEach((label, i) => {
      let count = 0
      statuses.forEach((state) => {
        if (state.name.trim().toLocaleLowerCase() === label) {
          if (!count) result[i] = state
          count += targets.get(state?._id) ?? 0
        }
      })
      ;(statusesCount as any)[label] = count
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
      targets.set(value, (targets.get(value) ?? 0) + 1)
    }
    for (const object of filter.value) {
      if (!targets.has(object)) targets.set(object, 0)
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

  function toggle (value: Doc | undefined | null): void {
    if (isSelected(value, filter.value)) {
      filter.value = filter.value.filter((p) => (value ? p !== value._id : p != null))
    } else {
      if (value) {
        filter.value = [...filter.value, value._id]
      } else {
        filter.value = [...filter.value, undefined]
      }
    }
  }

  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  onMount(() => {
    if (searchInput && !$deviceOptionsStore.isMobile) searchInput.focus()
  })

  const dispatch = createEventDispatcher()
  $: if (targetClass) getValues(search)

  function getStatusCount (value: Doc): string {
    const label = (value as Status).name.trim().toLowerCase()
    return statusesCount[label]?.toString() ?? ''
  }
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  {#if clazz.sortingKey}
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
          {#each values as value, i}
            <button
              class="menu-item no-focus"
              on:click={() => {
                toggle(value)
              }}
            >
              <div class="flex-between w-full">
                <div class="flex-row-center">
                  <div class="check pointer-events-none">
                    {#if isSelected(value, filter.value)}
                      <Icon icon={IconCheck} size={'small'} />
                    {/if}
                  </div>
                  {#if value}
                    <svelte:component this={attribute.presenter} {value} {...attribute.props} disabled oneLine />
                  {:else}
                    <Label label={ui.string.NotSelected} />
                  {/if}
                </div>
                <div class="content-dark-color ml-2">
                  {#if isStatus && value}
                    {getStatusCount(value)}
                  {:else}
                    {targets.get(value?._id) ?? ''}
                  {/if}
                </div>
              </div>
            </button>
          {/each}
        {/if}
      {/await}
    </div>
  </div>
  <Button
    shape={'filter'}
    label={view.string.Apply}
    on:click={() => {
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
