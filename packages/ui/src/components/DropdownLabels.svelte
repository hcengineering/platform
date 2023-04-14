<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { IntlString, Asset } from '@hcengineering/platform'
  import type { AnySvelteComponent, DropdownTextItem, TooltipAlignment, ButtonKind, ButtonSize } from '../types'
  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'
  import { showPopup } from '../popups'
  import { getFocusManager } from '../focus'
  import Button from './Button.svelte'
  import DropdownLabelsPopup from './DropdownLabelsPopup.svelte'
  import Label from './Label.svelte'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let placeholder: IntlString | undefined = ui.string.SearchDots
  export let items: DropdownTextItem[]
  export let multiselect = false
  export let selected: DropdownTextItem['id'] | DropdownTextItem['id'][] | undefined = multiselect ? [] : undefined
  export let allowDeselect: boolean = false

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let focusIndex = -1
  export let autoSelect: boolean = true
  export let useFlexGrow = false
  export let minW0 = true

  let container: HTMLElement
  let opened: boolean = false

  $: selectedItem = multiselect ? items.filter((p) => selected?.includes(p.id)) : items.find((x) => x.id === selected)
  $: if (autoSelect && selected === undefined && items[0] !== undefined) {
    selected = multiselect ? [items[0].id] : items[0].id
  }

  const dispatch = createEventDispatcher()
  const mgr = getFocusManager()
</script>

<div bind:this={container} class:min-w-0={minW0} class:flex-grow={useFlexGrow}>
  <Button
    {focusIndex}
    {icon}
    width={width ?? 'min-content'}
    {size}
    {kind}
    {justify}
    showTooltip={{ label, direction: labelDirection }}
    on:click={() => {
      if (!opened) {
        opened = true
        showPopup(
          DropdownLabelsPopup,
          { placeholder, items, multiselect, selected },
          container,
          (result) => {
            if (result != null) {
              if (allowDeselect && selected === result) {
                selected = undefined
                dispatch('selected', undefined)
              } else {
                selected = result
                dispatch('selected', result)
              }
            }
            opened = false
            mgr?.setFocusPos(focusIndex)
          },
          (result) => {
            if (result != null) {
              selected = result
              dispatch('selected', result)
            }
          }
        )
      }
    }}
  >
    <span slot="content" class="overflow-label disabled" class:content-color={selectedItem === undefined}>
      {#if Array.isArray(selectedItem)}
        {#if selectedItem.length > 0}
          {#each selectedItem as seleceted, i}
            <span class="step-row">{seleceted.label}</span>
          {/each}
        {:else}
          <Label label={label ?? ui.string.NotSelected} />
        {/if}
      {:else if selectedItem}
        {selectedItem.label}
      {:else}
        <Label label={label ?? ui.string.NotSelected} />
      {/if}
    </span>
  </Button>
</div>

<style lang="scss">
  .step-row + .step-row {
    position: relative;
    margin-left: 0.75rem;

    &::before {
      position: absolute;
      content: '';
      top: 50%;
      left: -0.5rem;
      width: 0.25rem;
      height: 0.25rem;
      background-color: var(--dark-color);
      border-radius: 50%;
      transform: translateY(-50%);
    }
  }
</style>
