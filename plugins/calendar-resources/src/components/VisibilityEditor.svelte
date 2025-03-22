<!--
// Copyright © 2023-2025 Hardcore Engineering Inc.
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
  import { Visibility } from '@hcengineering/calendar'
  import {
    Button,
    ButtonMenu,
    closeTooltip,
    DropdownIntlItem,
    eventToHTMLElement,
    showPopup,
    ModernPopup
  } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let value: Visibility | undefined
  export let disabled: boolean = false
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' | 'inline' = 'secondary'
  export let size: 'small' | 'medium' | 'large' = 'medium'
  export let withoutIcon: boolean = false
  export let focusIndex = -1

  let opened: boolean = false

  const dispatch = createEventDispatcher()

  const items: DropdownIntlItem[] = [
    {
      id: 'public',
      label: calendar.string.Public,
      icon: calendar.icon.Public
    },
    {
      id: 'freeBusy',
      label: calendar.string.FreeBusy,
      icon: calendar.icon.Private
    },
    {
      id: 'private',
      label: calendar.string.Private,
      icon: calendar.icon.Hidden
    }
  ]

  $: selected = value !== undefined ? items.find((item) => item.id === value) : undefined

  function change (val: Visibility): void {
    if (value !== val) {
      console.log('Changed', val)
      dispatch('change', val)
      value = val
    }
  }

  function openPopup (ev: MouseEvent): void {
    if (!opened) {
      opened = true
      closeTooltip()
      showPopup(ModernPopup, { items, selected: selected?.id }, eventToHTMLElement(ev), (selectedId) => {
        console.log('Selected', selectedId)
        if (selectedId !== undefined) {
          change(selectedId)
        }
        opened = false
      })
    }
  }
</script>

{#if kind === 'inline'}
  <Button
    icon={withoutIcon ? undefined : calendar.icon.Hidden}
    label={selected?.label}
    kind="ghost"
    padding="0.5rem"
    {size}
    {disabled}
    {focusIndex}
    id={'visibleButton'}
    on:click={openPopup}
  />
{:else}
  <ButtonMenu
    icon={withoutIcon ? undefined : calendar.icon.Hidden}
    label={selected?.label}
    selected={selected?.id}
    {items}
    {kind}
    {size}
    {disabled}
    {focusIndex}
    id={'visibleButton'}
    on:selected={(event) => {
      change(event.detail)
    }}
  />
{/if}
