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
  import { Class, Doc, FindResult, getObjectValue, Ref, SortingOrder, Space } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import ui, { Button, CheckBox, Label, Loading, resizeObserver } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
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

  async function getValues (): Promise<void> {
    if (objectsPromise) {
      await objectsPromise
    }
    values.clear()
    realValues.clear()
    let prefix = ''
    const hieararchy = client.getHierarchy()
    const attr = hieararchy.getAttribute(filter.key._class, filter.key.key)
    if (hieararchy.isMixin(attr.attributeOf)) {
      prefix = attr.attributeOf + '.'
    }
    objectsPromise = client.findAll(
      _class,
      { ...(space ? { space } : {}) },
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
      const d = realValue ? new Date(realValue as number).setHours(0, 0, 0, 0) : undefined
      values.set(d, (values.get(d) ?? 0) + 1)
      realValues.set(d, (realValues.get(d) ?? new Set()).add(realValue))
    }
    for (const object of filter.value.map((p) => p[0])) {
      if (!values.has(object)) values.set(object, 0)
    }
    values = values
    objectsPromise = undefined
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

  const dispatch = createEventDispatcher()

  getValues()
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
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
                <div class="flex clear-mins">
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
                <div class="content-dark-color ml-2">
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
