<!--
// Copyright © 2026 Hardcore Engineering Inc.
// Copyright © 2026 TraceX SAS.
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
  import { AccountRole } from '@hcengineering/core'
  import { DropdownLabelsIntl, type ButtonKind, type ButtonSize, type DropdownIntlItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import settingRes from '../plugin'

  export let selected: AccountRole
  export let disabled: boolean = false
  export let securityFilter: boolean = true
  export let roles: AccountRole[] | undefined = undefined
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let minWidth: string | undefined = undefined
  export let width: string | undefined = undefined
  export let justify: 'left' | 'center' = 'center'

  const dispatch = createEventDispatcher()

  const allRoleItems: DropdownIntlItem[] = [
    { id: AccountRole.ReadOnlyGuest, label: settingRes.string.ReadonlyGuest },
    { id: AccountRole.Guest, label: settingRes.string.Guest },
    { id: AccountRole.User, label: settingRes.string.User },
    { id: AccountRole.Maintainer, label: settingRes.string.Maintainer },
    { id: AccountRole.Owner, label: settingRes.string.Owner }
  ]

  $: roleItems = allRoleItems.filter((item) => roles === undefined || roles.includes(item.id as AccountRole))
  $: visibleRoleItems = securityFilter
    ? roleItems.filter(
        (item) =>
          item.id !== AccountRole.ReadOnlyGuest && item.id !== AccountRole.Owner && item.id !== AccountRole.Maintainer
      )
    : roleItems

  function handleSelected (e: CustomEvent<AccountRole>): void {
    dispatch('selected', e.detail)
  }
</script>

<DropdownLabelsIntl
  label={settingRes.string.Role}
  items={visibleRoleItems}
  {selected}
  {disabled}
  {kind}
  {size}
  {minWidth}
  {width}
  {justify}
  on:selected={handleSelected}
/>
