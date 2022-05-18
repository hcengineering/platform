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
  import { CheckBox } from '@anticrm/ui'
  import { Filter } from '@anticrm/view'
  import { onMount } from 'svelte'
  import { getPresenter } from '../../utils'
  import view from '../../plugin'

  export let _class: Ref<Class<Doc>>
  export let query: DocumentQuery<Doc>
  export let filter: Filter
  export let onChange: (e: Filter) => void

  filter.modes = [
    {
      label: view.string.FilterIs,
      isAvailable: (res: any[]) => res.length <= 1,
      result: (res: any[]) => {
        return { $in: res }
      }
    },
    {
      label: view.string.FilterIsEither,
      isAvailable: (res: any[]) => res.length > 1,
      result: (res: any[]) => {
        return { $in: res }
      }
    },
    {
      label: view.string.FilterIsNot,
      isAvailable: () => true,
      result: (res: any[]) => {
        return { $nin: res }
      }
    }
  ]

  const client = getClient()
  const key = { key: filter.key.key }
  const promise = getPresenter(client, _class, key, key)

  let values: Set<any> = new Set<any>()

  $: getValues(search)

  async function getValues (search: string): Promise<void> {
    const resultQuery =
      search !== ''
        ? {
            [filter.key.key]: { $like: '%' + search + '%' },
            ...query
          }
        : query
    const res = await client.findAll(_class, resultQuery)
    values = new Set(res.map((obj) => getObjectValue(filter.key.key, obj)))
  }

  function isSelected (value: any, values: any[]): boolean {
    return values.includes(value)
  }

  function checkMode () {
    if (filter.mode?.isAvailable(filter.value)) return
    const newMode = filter.modes.find((p) => p.isAvailable(filter.value))
    filter.mode = newMode !== undefined ? newMode : filter.mode
  }

  function toggle (value: any): void {
    if (isSelected(value, filter.value)) {
      filter.value = filter.value.filter((p) => p !== value)
    } else {
      filter.value = [...filter.value, value]
    }
    checkMode()
    onChange(filter)
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
</script>

<div class="selectPopup">
  <div class="header">
    <input
      bind:this={searchInput}
      type="text"
      bind:value={search}
      placeholder={phTraslate}
      on:input={(ev) => {}}
      on:change
    />
  </div>
  <div class="scroll">
    <div class="box">
      {#await promise then attribute}
        {#each Array.from(values) as value}
          <button
            class="menu-item"
            on:click={() => {
              toggle(value)
            }}
          >
            <div class="check pointer-events-none">
              <CheckBox checked={isSelected(value, filter.value)} primary />
            </div>
            <svelte:component this={attribute.presenter} {value} {...attribute.props} />
          </button>
        {/each}
      {/await}
    </div>
  </div>
</div>
