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
  import { IntlString, Asset } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { deepEqual } from 'fast-equals'

  import type { AnySvelteComponent, TooltipAlignment, ButtonKind, ButtonSize, DropdownIntlItem } from '../types'
  import { showPopup, closePopup } from '../popups'
  import Button from './Button.svelte'
  import DropdownLabelsPopupIntl from './DropdownLabelsPopupIntl.svelte'
  import Label from './Label.svelte'
  import ui from '../plugin'
  import DropdownIcon from './icons/Dropdown.svelte'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> = {}
  export let label: IntlString = ui.string.DropdownDefaultLabel
  export let params: Record<string, any> = {}
  export let items: DropdownIntlItem[]
  export let multiselect: boolean = false
  export let selected: DropdownIntlItem['id'] | Array<DropdownIntlItem['id']> | undefined = multiselect ? [] : undefined
  export let disabled: boolean = false
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let minWidth: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let shouldUpdateUndefined: boolean = true
  export let minW0 = true
  export let focusIndex: number = -1
  export let dataId: string | undefined = undefined
  export let noFocus: boolean = false
  export let withSearch: boolean = false

  let container: HTMLElement
  let opened: boolean = false

  $: selectedItem = multiselect
    ? (items ?? []).filter((p) => (selected as Array<DropdownIntlItem['id']>)?.includes(p.id))
    : (items ?? []).find((x) => x.id === selected)
  $: if (shouldUpdateUndefined && selected === undefined && items?.[0] !== undefined) {
    selected = multiselect ? [items[0].id] : items[0].id
    dispatch('selected', selected)
  }

  const dispatch = createEventDispatcher()

  function openPopup () {
    if (!opened) {
      opened = true
      showPopup(
        DropdownLabelsPopupIntl,
        { items, selected, params, withSearch, multiselect },
        container,
        (result) => {
          if (result) {
            selected = result
            dispatch('selected', result)
          }
          opened = false
        },
        (result) => {
          if (result != null) {
            selected = result
            dispatch('selected', result)
          }
        }
      )
    }
  }

  let prevItems: DropdownIntlItem[]
  $: if (!deepEqual(items, prevItems)) {
    prevItems = items

    if (opened) {
      closePopup()
      opened = false
      openPopup()
    }
  }
</script>

<div bind:this={container} class:min-w-0={minW0}>
  <Button
    {focusIndex}
    {dataId}
    {icon}
    {iconProps}
    width={width ?? 'min-content'}
    {minWidth}
    {size}
    {kind}
    {disabled}
    {justify}
    {noFocus}
    showTooltip={{ label, direction: labelDirection }}
    on:click={openPopup}
  >
    <span slot="content" class="overflow-label disabled flex-grow text-left mr-2">
      {#if Array.isArray(selectedItem)}
        {#if selectedItem.length > 0}
          {#each selectedItem as item}
            <span class="step-row">
              <Label label={item.label} params={item.params ?? params} />
            </span>
          {/each}
        {:else}
          <Label {label} {params} />
        {/if}
      {:else if selectedItem}
        <Label label={selectedItem.label} params={selectedItem.params ?? params} />
      {:else}
        <Label {label} {params} />
      {/if}
    </span>
    <svelte:fragment slot="iconRight">
      <DropdownIcon
        size={'small'}
        fill={kind === 'primary' && !disabled ? 'var(--primary-button-content-color)' : 'var(--theme-dark-color)'}
      />
    </svelte:fragment>
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
