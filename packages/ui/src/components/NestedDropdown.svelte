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
  import { IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import ui from '../plugin'
  import { showPopup } from '../popups'
  import type { ButtonKind, ButtonSize, DropdownIntlItem } from '../types'
  import Button from './Button.svelte'
  import DropdownIcon from './icons/Dropdown.svelte'
  import NestedMenu from './NestedMenu.svelte'
  import Label from './Label.svelte'

  export let items: [DropdownIntlItem, DropdownIntlItem[]][]
  export let label: IntlString = ui.string.DropdownDefaultLabel
  export let disabled: boolean = false
  export let selected: DropdownIntlItem | undefined = undefined

  export let width: string | undefined = undefined
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize | undefined = undefined
  export let withIcon: boolean = false
  export let withSelectIcon: boolean = true
  export let disableFocusOnMouseover: boolean = false
  export let withSearch: boolean = false

  let container: HTMLElement
  let opened: boolean = false

  const dispatch = createEventDispatcher()

  function openPopup (): void {
    if (!opened) {
      opened = true
      showPopup(NestedMenu, { items, withIcon, disableFocusOnMouseover, withSearch }, container, (result) => {
        if (result !== undefined) {
          selected = result
          dispatch('selected', result.id)
        }
        opened = false
      })
    }
  }
</script>

<div bind:this={container}>
  <Button
    width={width ?? 'min-content'}
    {kind}
    {size}
    {disabled}
    on:click={openPopup}
    icon={withIcon ? selected?.icon : undefined}
    iconProps={selected?.iconProps}
  >
    <span slot="content" class="overflow-label disabled flex-grow text-left mr-2">
      <Label label={selected !== undefined ? selected.label : label} />
    </span>
    <svelte:fragment slot="iconRight">
      {#if withSelectIcon}
        <DropdownIcon size={'small'} fill={!disabled ? 'var(--theme-content-color)' : 'var(--theme-dark-color)'} />
      {/if}
    </svelte:fragment>
  </Button>
</div>
