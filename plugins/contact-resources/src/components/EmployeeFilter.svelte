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
  import contact, { Employee } from '@hcengineering/contact'
  import core, { Doc, FindResult, getObjectValue, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import ui, {
    addNotification,
    deviceOptionsStore,
    EditWithIcon,
    Icon,
    IconCheck,
    IconSearch,
    Loading,
    resizeObserver,
    themeStore
  } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { FILTER_DEBOUNCE_MS, FilterRemovedNotification, sortFilterValues } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import EmployeePresenter from './EmployeePresenter.svelte'

  export let filter: Filter
  export let space: Ref<Space> | undefined = undefined
  export let onChange: (e: Filter) => void

  const client = getClient()
  filter.modes = filter.modes === undefined ? [view.filter.FilterObjectIn, view.filter.FilterObjectNin] : filter.modes
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  let values: (Employee | undefined | null)[] = []
  let objectsPromise: Promise<FindResult<Employee>> | undefined
  const targets = new Set<any>()

  let filterUpdateTimeout: any | undefined

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
      search !== ''
        ? {
            name: { $like: '%' + search + '%' },
            _id: { $in: Array.from(targets.keys()) }
          }
        : {
            _id: { $in: Array.from(targets.keys()) }
          }
    objectsPromise = client.findAll(contact.mixin.Employee, resultQuery, { sort: { name: SortingOrder.Ascending } })
    values = await objectsPromise
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
      {#if objectsPromise}
        <Loading />
      {:else}
        {#each values as value}
          <button
            class="menu-item no-focus flex-row-center"
            on:click={() => {
              handleFilterToggle(value)
            }}
          >
            <div class="clear-mins flex-grow">
              <EmployeePresenter
                {value}
                shouldShowPlaceholder
                defaultName={ui.string.NotSelected}
                disabled
                noUnderline
              />
            </div>
            <div class="check pointer-events-none">
              {#if isSelected(value, filter.value)}
                <Icon icon={IconCheck} size={'small'} />
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  </div>
  <div class="menu-space" />
</div>
