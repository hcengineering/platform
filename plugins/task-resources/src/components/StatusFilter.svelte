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
  import presentation, { getClient } from '@hcengineering/presentation'
  import { ProjectStatus, ProjectType, TaskType } from '@hcengineering/task'
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
  import {
    FILTER_DEBOUNCE_MS,
    FilterRemovedNotification,
    sortFilterValues,
    statusStore
  } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { buildConfigLookup, getPresenter } from '@hcengineering/view-resources/src/utils'
  import { createEventDispatcher } from 'svelte'
  import { typesOfJoinedProjectsStore, selectedTaskTypeStore, selectedTypeStore, taskTypeStore, typeStore } from '..'

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

  let filterUpdateTimeout: any | undefined

  async function getValues (
    search: string,
    selectedType: Ref<TaskType> | undefined,
    typeStore: IdMap<TaskType>,
    statusStore: IdMap<Status>,
    selectedProjectType: Ref<ProjectType> | undefined,
    projectTypeStore: IdMap<ProjectType>,
    joinedSpacesTypes: Ref<ProjectType>[]
  ): Promise<void> {
    await objectsPromise
    targets.clear()

    for (const object of filter.value) {
      targets.add(object)
    }
    const type = selectedType !== undefined ? typeStore.get(selectedType) : undefined
    if (type !== undefined) {
      values = type?.statuses?.map((p) => statusStore.get(p))
      for (const value of values) {
        targets.add(value?._id)
      }
      if (search !== '') {
        values = values.filter((p) => p?.name.includes(search))
      }
    } else {
      let statuses: Status[] = []
      const projectTypesNeeded = joinedSpacesTypes
        .flatMap((s) => projectTypeStore.get(s)?.statuses)
        .filter((it, index, arr) => it !== undefined && arr.indexOf(it) === index) as ProjectStatus[]
      const prjStatuses = new Map(
        (
          (selectedProjectType !== undefined ? projectTypeStore.get(selectedProjectType) : undefined)?.statuses ??
          projectTypesNeeded ??
          []
        ).map((p) => [p._id, p])
      )
      for (const status of statusStore.values()) {
        if (prjStatuses.size > 0 && !prjStatuses.has(status._id)) {
          continue
        }
        if (hierarchy.isDerived(status._class, targetClass)) {
          if (selectedProjectType === undefined) {
            if (status.ofAttribute === filter.key.attribute._id) {
              statuses.push(status)
              targets.add(status._id)
            }
          } else {
            statuses.push(status)
            targets.add(status._id)
          }
        }
      }
      statuses = statuses.filter((it, idx, arr) => arr.findIndex((q) => q._id === it._id) === idx)
      values = await sort(statuses)
    }
    if (targets.has(undefined)) {
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
    const categories = toIdMap(await client.findAll(core.class.StatusCategory, {}))
    statuses.sort((a, b) => {
      if (a.category !== undefined && b.category !== undefined && a.category !== b.category) {
        const aCat = categories.get(a.category)
        const bCat = categories.get(b.category)
        if (aCat !== undefined && bCat !== undefined) {
          return aCat.order - bCat.order
        }
      }
      return a.name.localeCompare(b.name)
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

  function updateFilter (): void {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  let search: string = ''

  const dispatch = createEventDispatcher()

  $: if (targetClass != null) {
    void getValues(
      search,
      $selectedTaskTypeStore,
      $taskTypeStore,
      $statusStore.byId,
      $selectedTypeStore,
      $typeStore,
      $typesOfJoinedProjectsStore
    )
  }
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
