<!--
//
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
//
-->
<script lang="ts">
  import login from '@hcengineering/login'
  import { type DropdownIntlItem, DropdownLabelsIntl } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import { formatInviteDuration, INVITE_EXPIRATION_PRESET_HOURS } from '../inviteDuration'

  /** Expiration in hours. A negative value means the link never expires. */
  export let value: number
  export let disabled: boolean = false

  const NEVER = 'never'
  const dispatch = createEventDispatcher()

  function toItem (hours: number): DropdownIntlItem {
    return { id: String(hours), ...formatInviteDuration(hours) }
  }

  // A value saved in the workspace settings that is not a preset is still shown, so nothing is lost
  $: hours =
    INVITE_EXPIRATION_PRESET_HOURS.includes(value) || value <= 0
      ? [...INVITE_EXPIRATION_PRESET_HOURS]
      : [...INVITE_EXPIRATION_PRESET_HOURS, value]
  $: items = [...hours.sort((a, b) => a - b).map(toItem), { id: NEVER, label: login.string.NoExpiration }]
  $: selected = value < 0 ? NEVER : String(value)

  function onSelected (e: CustomEvent<string>): void {
    const next = e.detail === NEVER ? -1 : Number(e.detail)
    if (next === value) return
    value = next
    dispatch('change', next)
  }
</script>

<DropdownLabelsIntl
  {items}
  {selected}
  {disabled}
  size={'medium'}
  width={'100%'}
  justify={'left'}
  on:selected={onSelected}
/>
