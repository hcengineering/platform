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
  import { translate } from '@hcengineering/platform'
  import { ButtonKind, Dropdown, ListItem, themeStore } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import calendar from '../plugin'

  export let value: Visibility | undefined
  export let disabled: boolean = false
  export let kind: ButtonKind = 'regular'
  export let withoutIcon: boolean = false

  let items: ListItem[] = []

  $: fill($themeStore.language)

  async function fill (lang: string) {
    items = [
      {
        _id: 'public',
        label: await translate(calendar.string.Public, {}, lang),
        icon: calendar.icon.Public
      },
      {
        _id: 'freeBusy',
        label: await translate(calendar.string.FreeBusy, {}, lang),
        icon: calendar.icon.Private
      },
      {
        _id: 'private',
        label: await translate(calendar.string.Private, {}, lang),
        icon: calendar.icon.Hidden
      }
    ]
  }

  $: selected = value !== undefined ? items.find((item) => item._id === value) : undefined

  const dispatch = createEventDispatcher()

  function change (val: Visibility) {
    if (value !== val) {
      dispatch('change', val)
      value = val
    }
  }
</script>

<Dropdown
  {disabled}
  icon={withoutIcon ? undefined : calendar.icon.Hidden}
  {kind}
  size={'medium'}
  placeholder={calendar.string.DefaultVisibility}
  {items}
  withSearch={false}
  {selected}
  on:selected={(e) => change(e.detail._id)}
/>
