<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { afterUpdate, createEventDispatcher, onMount } from 'svelte'
  import { translate } from '@anticrm/platform'
  import type { Ref, Class, Space, DocumentQuery } from '@anticrm/core'
  import { createQuery } from '../utils'
  import SpaceInfo from './SpaceInfo.svelte'
  import presentation from '..'
  import { ListView } from '@anticrm/ui'

  export let _class: Ref<Class<Space>>
  export let spaceQuery: DocumentQuery<Space> | undefined

  let search: string = ''
  let objects: Space[] = []
  let phTraslate: string = ''
  $: translate(presentation.string.Search, {}).then((res) => {
    phTraslate = res
  })
  let input: HTMLInputElement

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query(_class, { ...(spaceQuery ?? {}), name: { $like: '%' + search + '%' } }, (result) => {
    objects = result
  })
  afterUpdate(() => {
    dispatch('update', Date.now())
  })
  onMount(() => {
    if (input) input.focus()
  })

  let selection = 0
  let list: ListView

  async function handleSelection (evt: Event | undefined, selection: number): Promise<void> {
    const space = objects[selection]
    dispatch('close', space)
  }

  function onKeydown (key: KeyboardEvent): void {
    if (key.code === 'ArrowUp') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection - 1)
    }
    if (key.code === 'ArrowDown') {
      key.stopPropagation()
      key.preventDefault()
      list.select(selection + 1)
    }
    if (key.code === 'Enter') {
      key.preventDefault()
      key.stopPropagation()
      handleSelection(key, selection)
    }
    if (key.code === 'Escape') {
      key.preventDefault()
      key.stopPropagation()
      dispatch('close')
    }
  }
</script>

<div class="selectPopup" on:keydown={onKeydown}>
  <div class="header">
    <input bind:this={input} type="text" bind:value={search} placeholder={phTraslate} on:input={() => {}} on:change />
  </div>
  <div class="scroll">
    <div class="box">
      <ListView
        bind:this={list}
        count={objects.length}
        bind:selection
        on:click={(evt) => handleSelection(evt, evt.detail)}
      >
        <svelte:fragment slot="item" let:item>
          {@const space = objects[item]}

          <button
            class="menu-item flex-between"
            on:click={() => {
              handleSelection(undefined, item)
            }}
          >
            <SpaceInfo size={'large'} value={space} />
          </button>
        </svelte:fragment>
      </ListView>
    </div>
  </div>
</div>
