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
  export let label: IntlString = ui.string.DropdownDefaultLabel
  export let params: Record<string, any> = {}
  export let items: DropdownIntlItem[]
  export let selected: DropdownIntlItem['id'] | undefined = undefined
  export let disabled: boolean = false
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let shouldUpdateUndefined: boolean = true
  export let minW0 = true

  let container: HTMLElement
  let opened: boolean = false

  $: selectedItem = items.find((x) => x.id === selected)
  $: if (shouldUpdateUndefined && selected === undefined && items[0] !== undefined) {
    selected = items[0].id
    dispatch('selected', selected)
  }

  const dispatch = createEventDispatcher()

  function openPopup () {
    if (!opened) {
      opened = true
      showPopup(DropdownLabelsPopupIntl, { items, selected, params }, container, (result) => {
        if (result) {
          selected = result
          dispatch('selected', result)
        }
        opened = false
      })
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
    {icon}
    width={width ?? 'min-content'}
    {size}
    {kind}
    {disabled}
    {justify}
    showTooltip={{ label, direction: labelDirection }}
    on:click={openPopup}
  >
    <span slot="content" class="overflow-label disabled flex-grow text-left mr-2">
      <Label
        label={selectedItem ? selectedItem.label : label}
        params={selectedItem ? selectedItem.params ?? params : params}
      />
    </span>
    <svelte:fragment slot="iconRight">
      <DropdownIcon
        size={'small'}
        fill={kind === 'accented' && !disabled ? 'var(--accented-button-content-color)' : 'var(--theme-dark-color)'}
      />
    </svelte:fragment>
  </Button>
</div>
