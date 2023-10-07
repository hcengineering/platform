<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import core, { Class, Ref, Space } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    CheckBox,
    deviceOptionsStore,
    resizeObserver,
    tooltip,
    EditWithIcon,
    IconSearch
  } from '@hcengineering/ui'
  import { ComponentType, createEventDispatcher } from 'svelte'
  import presentation from '..'
  import { createQuery } from '../utils'
  import SpaceInfo from './SpaceInfo.svelte'

  export let _classes: Ref<Class<Space>>[] = []
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let placeholderParam: any | undefined = undefined
  export let selected: Ref<Space> | undefined
  export let selectedSpaces: Ref<Space>[] = []
  export let iconWithEmoji: AnySvelteComponent | Asset | ComponentType | undefined = undefined
  export let defaultIcon: AnySvelteComponent | Asset | ComponentType | undefined = undefined

  let searchQuery: string = ''
  let spaces: Space[] = []
  let shownSpaces: Space[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()

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
      return !sp.archived || searchQuery || selectedSpaces.includes(sp._id)
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
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="header">
    <EditWithIcon
      icon={IconSearch}
      size={'large'}
      width={'100%'}
      autoFocus={!$deviceOptionsStore.isMobile}
      bind:value={searchQuery}
      {placeholder}
      {placeholderParam}
      on:change
    />
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
            <CheckBox checked={isSelected(space)} kind={'accented'} />
          </div>
          <SpaceInfo size={'medium'} value={space} {iconWithEmoji} {defaultIcon} />
          {#if allowDeselect && space._id === selected}
            <div class="check pointer-events-none">
              {#if titleDeselect}
                <div class="clear-mins" use:tooltip={{ label: titleDeselect ?? presentation.string.Deselect }}>
                  <CheckBox checked circle kind={'accented'} />
                </div>
              {:else}
                <CheckBox checked circle kind={'accented'} />
              {/if}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>
