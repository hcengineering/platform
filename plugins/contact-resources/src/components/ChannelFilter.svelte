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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import { Button, CheckBox, Icon, Label, resizeObserver } from '@hcengineering/ui'
  import { Filter } from '@hcengineering/view'
  import { FilterQuery } from '@hcengineering/view-resources'
  import view from '@hcengineering/view-resources/src/plugin'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import { channelProviders } from '../utils'

  export let _class: Ref<Class<Doc>>
  export let filter: Filter
  export let onChange: (e: Filter) => void
  filter.onRemove = () => {
    FilterQuery.remove(filter.index)
  }
  let selected: Ref<ChannelProvider>[] = filter.value
  const level: number = filter.props?.level ?? 0

  filter.modes = [contact.filter.FilterChannelIn, contact.filter.FilterChannelNin]
  filter.mode = filter.mode === undefined ? filter.modes[0] : filter.mode

  const isSelected = (element: ChannelProvider): boolean => {
    if (selected.filter((p) => p === element._id).length > 0) return true
    return false
  }

  const checkSelected = (element: ChannelProvider): void => {
    if (isSelected(element)) {
      selected = selected.filter((p) => p !== element._id)
    } else {
      selected = [...selected, element._id]
    }
  }

  const dispatch = createEventDispatcher()
</script>

<div class="selectPopup" use:resizeObserver={() => dispatch('changeContent')}>
  <div class="scroll">
    <div class="box">
      {#each $channelProviders as element}
        <button
          class="menu-item"
          on:click={() => {
            checkSelected(element)
          }}
        >
          <div class="flex-between w-full">
            <div class="flex">
              <div class="check pointer-events-none">
                <CheckBox checked={isSelected(element)} primary />
              </div>
              {#if element.icon}
                <span class="mr-2"><Icon icon={element.icon} size="inline" /></span>
              {/if}
              <Label label={element.label} />
            </div>
          </div>
        </button>
      {/each}
    </div>
  </div>
  <Button
    shape={'round'}
    label={view.string.Apply}
    on:click={async () => {
      filter.value = [...selected]
      // Replace last one with value with level
      filter.props = { level }
      onChange(filter)
      dispatch('close')
    }}
  />
</div>
