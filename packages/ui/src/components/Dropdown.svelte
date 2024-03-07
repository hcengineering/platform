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
  import type {
    AnySvelteComponent,
    ButtonBaseKind,
    ButtonBaseSize,
    ButtonBaseType,
    LabelAndProps,
    ListItem,
  } from '../types'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'
  import { getFocusManager } from '../focus'
  import { showPopup } from '../popups'
  import DropdownPopup from './DropdownPopup.svelte'
  import ButtonBase from './ButtonBase.svelte'

  export let items: ListItem[] = []
  export let selected: ListItem | undefined = undefined
  export let placeholder: IntlString | undefined = undefined
  export let withSearch: boolean = true

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let type: ButtonBaseType = 'type-button'
  export let kind: ButtonBaseKind = 'secondary'
  export let size: ButtonBaseSize = 'small'
  export let disabled: boolean = false
  export let focusIndex = -1
  export let tooltip: LabelAndProps | undefined = undefined

  const dispatch = createEventDispatcher()
  const mgr = getFocusManager()

  let container: HTMLElement | undefined
  let opened: boolean = false

  $: buttonTitle = placeholder === undefined ? undefined : selected?.label
  $: buttonLabel = selected?.label === undefined ? placeholder : undefined

  function handleClick () {
    if (!opened) {
      opened = true
      showPopup(DropdownPopup, { items, icon, withSearch }, container, (result) => {
        if (result) {
          selected = result
          dispatch('selected', result)
        }
        opened = false
        mgr?.setFocusPos(focusIndex)
      })
    }
  }
</script>

<div bind:this={container} class="min-w-0">
  <ButtonBase
    {icon}
    iconProps={selected?.iconProps}
    title={buttonTitle}
    label={buttonLabel}
    {type}
    {kind}
    {size}
    {disabled}
    {focusIndex}
    {tooltip}
    on:click={handleClick}
  />
</div>
