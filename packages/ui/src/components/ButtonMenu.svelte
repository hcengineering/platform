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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { deepEqual } from 'fast-equals'
  import { ComponentType, createEventDispatcher } from 'svelte'
  import { closePopup, showPopup } from '..'
  import { AnySvelteComponent, DropdownIntlItem } from '../types'
  import ButtonBase from './ButtonBase.svelte'
  import ModernPopup from './ModernPopup.svelte'

  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let size: 'large' | 'medium' | 'small' = 'large'
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let disabled: boolean = false
  export let loading: boolean = false
  export let inheritColor: boolean = false
  export let noSelection: boolean = false

  export let items: DropdownIntlItem[]
  export let params: Record<string, any> = {}
  export let selected: DropdownIntlItem['id'] | undefined = undefined
  export let element: HTMLButtonElement | undefined = undefined
  export let focusIndex = -1
  export let id: string | undefined = undefined

  let opened: boolean = false

  const dispatch = createEventDispatcher()

  function openPopup () {
    if (!opened) {
      opened = true
      showPopup(ModernPopup, { items, selected: noSelection ? undefined : selected, params }, element, (result) => {
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

<ButtonBase
  type={'type-button'}
  hasMenu
  bind:element
  {kind}
  {title}
  {label}
  {labelParams}
  {size}
  {icon}
  {iconProps}
  {disabled}
  {loading}
  {inheritColor}
  pressed={opened}
  {focusIndex}
  {id}
  on:click={openPopup}
/>
