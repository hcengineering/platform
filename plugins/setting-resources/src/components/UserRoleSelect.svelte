<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import { DropdownLabelsIntl, type DropdownIntlItem } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import settingRes from '../plugin'

  export let selected: AccountRole
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  const inviteRoleItems: DropdownIntlItem[] = [
    { id: AccountRole.Guest, label: settingRes.string.Guest },
    { id: AccountRole.User, label: settingRes.string.User },
    { id: AccountRole.Maintainer, label: settingRes.string.Maintainer },
    { id: AccountRole.Owner, label: settingRes.string.Owner }
  ]

  function handleSelected (e: CustomEvent<AccountRole>): void {
    dispatch('selected', e.detail)
  }
</script>

<DropdownLabelsIntl
  kind={'regular'}
  size={'medium'}
  items={inviteRoleItems}
  {selected}
  {disabled}
  on:selected={handleSelected}
/>
