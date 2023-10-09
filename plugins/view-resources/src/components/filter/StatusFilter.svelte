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
  import core, { Doc, FindResult, IdMap, Ref, RefTo, Space, Status, toIdMap } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { createQuery, getClient } from '@hcengineering/presentation'
  import task, { SpaceWithStates, calcRank } from '@hcengineering/task'
  import ui, {
    EditWithIcon,
    Icon,
    IconCheck,
    IconSearch,
    Label,
    Loading,
    addNotification,
    deviceOptionsStore,
    resizeObserver,
    themeStore
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { createEventDispatcher } from 'svelte'
  import { FILTER_DEBOUNCE_MS, FilterRemovedNotification, sortFilterValues, statusStore } from '../..'
  import view from '../../plugin'
  import { buildConfigLookup, getPresenter } from '../../utils'

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

  let values: (Status | undefined | null)[] = []
  let objectsPromise: Promise<FindResult<Status>> | undefined

  const targets = new Set<any>()
  $: targetClass = (filter.key.attribute.type as RefTo<Status>).to
  $: clazz = hierarchy.getClass(targetClass)

  let _space: SpaceWithStates | undefined = undefined
  const query = createQuery()
  if (space !== undefined) {
    query.query(task.class.SpaceWithStates, { _id: space as Ref<SpaceWithStates> }, (res) => {
      _space = res[0]
    })
  }

  let filterUpdateTimeout: any | undefined

  async function getValues (search: string, statusStore: IdMap<Status>): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    targets.clear()

    for (const object of filter.value) {
      targets.add(object)
    }
    const isDone = hierarchy.isDerived(targetClass, task.class.DoneState)

    if (space !== undefined) {
      const _space = await client.findOne(task.class.SpaceWithStates, { _id: space as Ref<SpaceWithStates> })
      if (_space) {
        const key = isDone ? 'doneStates' : 'states'
        values = (_space as any)[key].map((p: Ref<Status>) => statusStore.get(p)).filter((p: Status) => p !== undefined)
        for (const value of values) {
          targets.add(value?._id)
        }
        if (search !== '') {
          values = values.filter((p) => p?.name.includes(search))
        }
      }
    } else {
      const statuses: Status[] = []
      for (const status of statusStore.values()) {
        if (hierarchy.isDerived(status._class, targetClass) && status.ofAttribute === filter.key.attribute._id) {
          statuses.push(status)
          targets.add(status._id)
        }
      }
      values = await sort(statuses)
    }
    if (targets.has(undefined) || isDone) {
      values.unshift(undefined)
    }
    if (values.length !== targets.size) {
      const oldSize = filter.value.length
      filter.value = filter.value.filter((p) => targets.has(p))
      const removed = oldSize - (filter.value.length ?? 0)
      if (removed > 0) {
        onChange(filter)
        addNotification(
          await translate(view.string.FilterUpdated, {}, $themeStore.language),
          filter.key.label,
          FilterRemovedNotification,
          {
            description: await translate(view.string.FilterRemoved, { count: removed }, $themeStore.language)
          }
        )
      }
    }
    values = sortFilterValues(values, (v) => isSelected(v, filter.value))
    objectsPromise = undefined
  }

  async function sort (statuses: Status[]): Promise<Status[]> {
    if (_space === undefined) {
      let space: SpaceWithStates | undefined = undefined
      const res: Map<Ref<Status>, string> = new Map()
      for (const state of statuses) {
        if (res.has(state._id)) continue
        const query = hierarchy.isDerived(state._class, task.class.DoneState)
          ? { doneStates: state._id }
          : { states: state._id }
        space = (await client.findOne(task.class.SpaceWithStates, query)) as SpaceWithStates | undefined
        if (space === undefined) continue
        const spaceStateArray = hierarchy.isDerived(state._class, task.class.DoneState)
          ? space.doneStates
          : space.states
        if (spaceStateArray === undefined) continue
        for (let index = 0; index < spaceStateArray.length; index++) {
          const st = spaceStateArray[index]
          const prev = index > 0 ? res.get(spaceStateArray[index - 1]) : undefined
          const next = index < spaceStateArray.length - 1 ? res.get(spaceStateArray[index + 1]) : undefined
          res.set(st, calcRank(prev ? { rank: prev } : undefined, next ? { rank: next } : undefined))
        }
      }
      const result: Array<{
        _id: Ref<Status>
        rank: string
      }> = []
      for (const [key, value] of res.entries()) {
        result.push({ _id: key, rank: value })
      }
      result.sort((a, b) => a.rank.localeCompare(b.rank))
      statuses = result.map((p) => statuses.find((s) => s._id === p._id)).filter((p) => p !== undefined) as Status[]
    }

    const categories = toIdMap(await client.findAll(core.class.StatusCategory, {}))
    statuses.sort((a, b) => {
      if (a.category !== undefined && b.category !== undefined && a.category !== b.category) {
        const aCat = categories.get(a.category)
        const bCat = categories.get(b.category)
        if (aCat !== undefined && bCat !== undefined) {
          return aCat.order - bCat.order
        }
      }
      if (_space != null) {
        const aIndex = _space.states.findIndex((s) => s === a._id)
        const bIndex = _space.states.findIndex((s) => s === b._id)
        return aIndex - bIndex
      } else {
        return 0
      }
    })

    return statuses
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
  $: if (targetClass) getValues(search, $statusStore)
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  {#if clazz.filteringKey}
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
          {#each values as value}
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
                      <svelte:component
                        this={attribute.presenter}
                        {value}
                        {...attribute.props}
                        {space}
                        disabled
                        oneLine
                      />
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
