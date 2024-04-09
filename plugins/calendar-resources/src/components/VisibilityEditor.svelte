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
  import { Visibility } from '@hcengineering/calendar'
  import { ButtonMenu, DropdownIntlItem, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let value: Visibility | undefined
  export let disabled: boolean = false
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let size: 'small' | 'medium' | 'large' = 'medium'
  export let withoutIcon: boolean = false
  export let focusIndex = -1

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

  function change (val: Visibility) {
    if (value !== val) {
      dispatch('change', val)
      value = val
    }
  }
</script>

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
    if (event.detail) change(event.detail)
  }}
/>
