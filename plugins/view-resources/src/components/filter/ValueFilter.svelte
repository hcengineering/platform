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
  import { Class, Doc, FindResult, getObjectValue, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { getClient } from '@hcengineering/presentation'
  import ui, { Button, CheckBox, Label, Loading, resizeObserver, deviceOptionsStore } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { onMount } from 'svelte'
  import { getPresenter } from '../../utils'
  import view from '../../plugin'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Doc>>
  export let space: Ref<Space> | undefined = undefined
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = [view.filter.FilterValueIn, view.filter.FilterValueNin]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  const client = getClient()
  const key = { key: filter.key.key }
  const promise = getPresenter(client, filter.key._class, key, key)

  let values = new Map<any, number>()
  let selectedValues: Set<any> = new Set<any>(filter.value.map((p) => p[0]))
  const realValues = new Map<any, Set<any>>()

  let objectsPromise: Promise<FindResult<Doc>> | undefined

  async function getValues (search: string): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    values.clear()
    realValues.clear()
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
      console.log('prefix', prefix)
    }
    objectsPromise = client.findAll(
      _class,
      { ...resultQuery, ...(space ? { space } : {}) },
      {
        sort: { [filter.key.key]: SortingOrder.Ascending },
        projection: { [prefix + filter.key.key]: 1 }
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
      values.set(value, (values.get(value) ?? 0) + 1)
      realValues.set(value, (realValues.get(value) ?? new Set()).add(realValue))
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

  function toggle (value: any): void {
    if (isSelected(value, selectedValues)) {
      selectedValues.delete(value)
    } else {
      selectedValues.add(value)
    }
    selectedValues = selectedValues
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
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#if objectsPromise}
          <Loading />
        {:else}
          {#each Array.from(values.keys()) as value}
            {@const realValue = [...(realValues.get(value) ?? [])][0]}
            <button
              class="menu-item"
              on:click={() => {
                toggle(value)
              }}
            >
              <div class="flex-between w-full">
                <div class="flex">
                  <div class="check pointer-events-none">
                    <CheckBox checked={isSelected(value, selectedValues)} primary />
                  </div>
                  {#if value !== undefined}
                    <svelte:component
                      this={attribute.presenter}
                      value={typeof value === 'string' ? realValue : value}
                      {...attribute.props}
                    />
                  {:else}
                    <Label label={ui.string.NotSelected} />
                  {/if}
                </div>
                <div class="content-trans-color ml-2">
                  {values.get(value)}
                </div>
              </div>
            </button>
          {/each}
        {/if}
      {/await}
    </div>
  </div>
  <Button
    shape={'round'}
    label={view.string.Apply}
    on:click={() => {
      filter.value = Array.from(selectedValues.values()).map((p) => {
        return [p, Array.from(realValues.get(p) ?? [])]
      })
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
