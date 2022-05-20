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
  import { Class, Doc, DocumentQuery, getObjectValue, Ref } from '@anticrm/core'
  import { translate } from '@anticrm/platform'
  import presentation, { getClient } from '@anticrm/presentation'
  import ui, { Button, CheckBox, Label } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { onMount } from 'svelte'
  import { getPresenter } from '../../utils'
  import view from '../../plugin'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = [
    {
      label: view.string.FilterIs,
      isAvailable: (res: any[]) => res.length <= 1,
      result: async (res: [any, any[]][]) => {
        return { $in: res.map((p) => p[1]).flat() }
      }
    },
    {
      label: view.string.FilterIsEither,
      isAvailable: (res: any[]) => res.length > 1,
      result: async (res: [any, any[]][]) => {
        return { $in: res.map((p) => p[1]).flat() }
      }
    },
    {
      label: view.string.FilterIsNot,
      isAvailable: () => true,
      result: async (res: [any, any[]][]) => {
        return { $nin: res.map((p) => p[1]).flat() }
      }
    }
  ]

  const client = getClient()
  const key = { key: filter.key.key }
  const promise = getPresenter(client, _class, key, key)

  let values = new Map<any, number>()
  let selectedValues: Set<any> = new Set<any>(filter.value.map((p) => p[0]))
  const realValues = new Map<any, Set<any>>()

  $: getValues(search)

  async function getValues (search: string): Promise<void> {
    values.clear()
    realValues.clear()
    const resultQuery =
      search !== ''
        ? {
            [filter.key.key]: { $like: '%' + search + '%' },
            ...query
          }
        : query
    const res = await client.findAll(_class, resultQuery, { projection: { [filter.key.key]: 1 } })
    for (const object of res) {
      const realValue = getObjectValue(filter.key.key, object)
      const value = typeof realValue === 'string' ? realValue.trim().toUpperCase() : realValue ?? undefined
      values.set(value, (values.get(value) ?? 0) + 1)
      realValues.set(value, (realValues.get(value) ?? new Set()).add(realValue))
    }
    values = values
  }

  function isSelected (value: any, values: Set<any>): boolean {
    return values.has(value)
  }

  function checkMode () {
    if (filter.mode?.isAvailable(filter.value)) return
    const newMode = filter.modes.find((p) => p.isAvailable(filter.value))
    filter.mode = newMode !== undefined ? newMode : filter.mode
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
    if (searchInput) searchInput.focus()
  })
</script>

<div class="selectPopup">
  <div class="header">
    <input bind:this={searchInput} type="text" bind:value={search} placeholder={phTraslate} />
  </div>
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#each Array.from(values.keys()) as value}
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
                {#if value}
                  <svelte:component this={attribute.presenter} {value} {...attribute.props} />
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
      checkMode()
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
