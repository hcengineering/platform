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
  import { Class, Doc, DocumentQuery, getObjectValue, Ref, RefTo } from '@anticrm/core'
  import { translate } from '@anticrm/platform'
  import presentation, { getClient } from '@anticrm/presentation'
  import ui, { Button, CheckBox, Label } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { onMount } from 'svelte'
  import { buildConfigLookup, getPresenter } from '../../utils'
  import view from '../../plugin'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let filter: Filter
  export let onChange: (e: Filter) => void

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const tkey = '$lookup.' + filter.key.key
  const key = { key: tkey }
  const lookup = buildConfigLookup(hierarchy, _class, [tkey])
  const promise = getPresenter(client, _class, key, key, lookup)
  filter.modes = [
    {
      label: view.string.FilterIs,
      isAvailable: (res: any[]) => res.length <= 1,
      result: async (res: any[]) => {
        return { $in: res }
      }
    },
    {
      label: view.string.FilterIsEither,
      isAvailable: (res: any[]) => res.length > 1,
      result: async (res: any[]) => {
        return { $in: res }
      }
    },
    {
      label: view.string.FilterIsNot,
      isAvailable: () => true,
      result: async (res: any[]) => {
        return { $nin: res }
      }
    }
  ]

  let values: (Doc | undefined | null)[] = []

  $: getValues(search)

  const targets = new Map<any, number>()
  async function getValues (search: string): Promise<void> {
    targets.clear()
    const baseObjects = await client.findAll(_class, query, { projection: { [filter.key.key]: 1 } })
    for (const object of baseObjects) {
      const value = getObjectValue(filter.key.key, object) ?? undefined
      targets.set(value, (targets.get(value) ?? 0) + 1)
    }
    const targetClass = (hierarchy.getAttribute(_class, filter.key.key).type as RefTo<Doc>).to
    const clazz = hierarchy.getClass(targetClass)
    const resultQuery =
      search !== '' && clazz.sortingKey
        ? {
            [clazz.sortingKey]: { $like: '%' + search + '%' },
            _id: { $in: Array.from(targets.keys()) }
          }
        : {
            _id: { $in: Array.from(targets.keys()) }
          }
    values = await client.findAll(targetClass, resultQuery)
    if (targets.has(undefined)) {
      values.unshift(undefined)
    }
  }

  function isSelected (value: Doc | undefined | null, values: any[]): boolean {
    return values.includes(value?._id ?? value)
  }

  function checkMode () {
    if (filter.mode?.isAvailable(filter.value)) return
    const newMode = filter.modes.find((p) => p.isAvailable(filter.value))
    filter.mode = newMode !== undefined ? newMode : filter.mode
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
    checkMode()
  }

  let search: string = ''
  let phTraslate: string = ''
  let searchInput: HTMLInputElement
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })

  onMount(() => {
    if (searchInput) searchInput.focus()
  })

  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup">
  <div class="header">
    <input bind:this={searchInput} type="text" bind:value={search} placeholder={phTraslate} />
  </div>
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#each values as value}
          <button
            class="menu-item"
            on:click={() => {
              toggle(value)
            }}
          >
            <div class="flex-between w-full">
              <div class="flex">
                <div class="check pointer-events-none">
                  <CheckBox checked={isSelected(value, filter.value)} primary />
                </div>
                {#if value}
                  <svelte:component this={attribute.presenter} {value} {...attribute.props} />
                {:else}
                  <Label label={ui.string.NotSelected} />
                {/if}
              </div>
              <div class="content-trans-color ml-2">
                {targets.get(value?._id)}
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
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
