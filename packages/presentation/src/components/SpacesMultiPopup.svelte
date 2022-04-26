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
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { createEventDispatcher, onMount } from 'svelte'

  import core, { Class, Doc, Ref, Space } from '@anticrm/core'
  import { Tooltip, CheckBox } from '@anticrm/ui'

  import { createQuery } from '../utils'
  import presentation from '..'
  import SpaceInfo from './SpaceInfo.svelte';

  export let selected: Ref<Space> | undefined
  export let _classes: Ref<Class<Space>>[] = []
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedSpaces: Ref<Space>[] = []
  export let ignoreSpaces: Ref<Space>[] = []

  let search: string = ''
  let objects: Space[] = []
  let input: HTMLInputElement

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query<Space>(
    core.class.Space,
    {
      name: { $like: '%' + search + '%' },
      _class: { $in: _classes },
      _id: { $nin: ignoreSpaces }
    },
    result => {
      objects = result
    },
    { limit: 200 }
  )

  let phTraslate: string = ''
  $: if (placeholder) translate(placeholder, {}).then(res => { phTraslate = res })

  const isSelected = (space: Space): boolean => {
    if (selectedSpaces.filter(s => s === space._id).length > 0) return true
    return false
  }
  const checkSelected = (space: Space): void => {
    if (isSelected(space)) {
      selectedSpaces = selectedSpaces.filter(s => s !== space._id)
    } else {
      selectedSpaces.push(space._id)
    }
    objects = objects
    dispatch('update', selectedSpaces)
  }
  onMount(() => { if (input) input.focus() })
</script>

<div class="selectPopup">
  <div class="header">
    <input bind:this={input} type='text' bind:value={search} placeholder={phTraslate} on:change/>
  </div>
  <div class="scroll">
    <div class="box">
      {#each objects as space}
        <button class="menu-item" on:click={() => {
          checkSelected(space)
        }}>
          <div class="check pointer-events-none">
            <CheckBox checked={isSelected(space)} primary />
          </div>
          <SpaceInfo size={'medium'} value={space} />
          {#if allowDeselect && space._id === selected}
            <div class="check-right pointer-events-none">
              {#if titleDeselect}
                <Tooltip label={titleDeselect ?? presentation.string.Deselect}>
                  <CheckBox checked circle primary />
                </Tooltip>
              {:else}
                <CheckBox checked circle primary />
              {/if}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
