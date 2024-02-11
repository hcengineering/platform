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
  import { ChannelProvider } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { IconCheck, Icon, Label, resizeObserver } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { FILTER_DEBOUNCE_MS, FilterQuery, sortFilterValues } from '@hcengineering/view-resources'
  import { createEventDispatcher } from 'svelte'
  import { channelProviders } from '../utils'
  import contact from '../plugin'

  export let filter: Filter
  export let onChange: (e: Filter) => void
  filter.onRemove = () => {
    FilterQuery.remove(filter.index)
  }
  let selected: Ref<ChannelProvider>[] = filter.value
  const level: number = filter.props?.level ?? 0

  let filterUpdateTimeout: any | undefined

  filter.modes = [
    contact.filter.FilterChannelIn,
    contact.filter.FilterChannelNin,
    contact.filter.FilterChannelHasMessages,
    contact.filter.FilterChannelHasNewMessages
  ]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  const isSelected = (element: ChannelProvider, selected: Ref<ChannelProvider>[]): boolean => {
    if (selected.filter((p) => p === element._id).length > 0) return true
    return false
  }

  function handleFilterToggle (element: ChannelProvider) {
    if (isSelected(element, selected)) {
      selected = selected.filter((p) => p !== element._id)
    } else {
      selected = [...selected, element._id]
    }

    updateFilter(selected)
  }

  function updateFilter (newValues: Ref<ChannelProvider>[]) {
    clearTimeout(filterUpdateTimeout)

    filterUpdateTimeout = setTimeout(() => {
      filter.value = [...newValues]
      // Replace last one with value with level
      filter.props = { level }
      onChange(filter)
    }, FILTER_DEBOUNCE_MS)
  }

  const dispatch = createEventDispatcher()

  const sortedElemenets = sortFilterValues($channelProviders, (v) => isSelected(v, selected))
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="menu-space" />
  <div class="scroll">
    <div class="box">
      {#each sortedElemenets as element}
        <button
          class="menu-item no-focus flex-row-center content-pointer-events-none"
          on:click={() => {
            handleFilterToggle(element)
          }}
        >
          {#if element.icon}
            <div class="icon"><Icon icon={element.icon} size={'small'} /></div>
          {/if}
          <span class="overflow-label label flex-grow"><Label label={element.label} /></span>
          <div class="check">
            {#if isSelected(element, selected)}
              <Icon icon={IconCheck} size={'small'} />
            {/if}
          </div>
        </button>
      {/each}
    </div>
  </div>
  <div class="menu-space" />
</div>
