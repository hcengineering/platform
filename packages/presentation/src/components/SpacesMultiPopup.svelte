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
  import type { IntlString } from '@hcengineering/platform'
  import { translate } from '@hcengineering/platform'
  import { createEventDispatcher, onMount } from 'svelte'
  import core, { Class, getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import { tooltip, CheckBox, resizeObserver, deviceOptionsStore } from '@hcengineering/ui'
  import { createQuery } from '../utils'
  import presentation from '..'
  import SpaceInfo from './SpaceInfo.svelte'

  export let _classes: Ref<Class<Space>>[] = []
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selected: Ref<Space> | undefined
  export let selectedSpaces: Ref<Space>[] = []

  let searchQuery: string = ''
  let spaces: Space[] = []
  let shownSpaces: Space[] = []
  let input: HTMLInputElement

  const dispatch = createEventDispatcher()
  const query = createQuery()
  const myAccId = getCurrentAccount()._id

  $: query.query<Space>(
    core.class.Space,
    {
      name: { $like: '%' + searchQuery + '%' },
      _class: { $in: _classes }
    },
    (result) => {
      spaces = result
    },
    { limit: 200 }
  )

  $: update(spaces)
  const update = (spaces_: Space[]) => {
    shownSpaces = spaces_.filter((sp) => {
      // don't show archived unless search is specified or this space is selected
      // show private only if it includes the current user
      return (
        (!sp.archived || searchQuery || selectedSpaces.includes(sp._id)) &&
        (!sp.private || sp.members.includes(myAccId))
      )
    })
  }

  let phTraslate: string = ''
  $: if (placeholder) {
    translate(placeholder, {}).then((res) => {
      phTraslate = res
    })
  }

  const isSelected = (space: Space): boolean => {
    if (selectedSpaces.filter((s) => s === space._id).length > 0) return true
    return false
  }

  const checkSelected = (space: Space): void => {
    if (isSelected(space)) {
      selectedSpaces = selectedSpaces.filter((s) => s !== space._id)
    } else {
      selectedSpaces.push(space._id)
    }
    spaces = spaces
    dispatch('update', selectedSpaces)
  }

  onMount(() => {
    if (input && !$deviceOptionsStore.isMobile) input.focus()
  })
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <input bind:this={input} type="text" bind:value={searchQuery} placeholder={phTraslate} on:change />
  </div>
  <div class="scroll">
    <div class="box">
      {#each shownSpaces as space}
        <button
          class="menu-item"
          on:click={() => {
            checkSelected(space)
          }}
        >
          <div class="check pointer-events-none">
            <CheckBox checked={isSelected(space)} primary />
          </div>
          <SpaceInfo size={'medium'} value={space} />
          {#if allowDeselect && space._id === selected}
            <div class="check-right pointer-events-none">
              {#if titleDeselect}
                <div class="clear-mins" use:tooltip={{ label: titleDeselect ?? presentation.string.Deselect }}>
                  <CheckBox checked circle primary />
                </div>
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
