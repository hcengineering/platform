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

  import { INVITE_USES_PRESETS } from '../inviteDuration'

  /** Maximum number of uses. A negative value means the link can be used without limit. */
  export let value: number
  export let disabled: boolean = false

  const UNLIMITED = 'unlimited'
  const dispatch = createEventDispatcher()

  function toItem (count: number): DropdownIntlItem {
    return { id: String(count), label: login.string.UsesLimit, params: { count } }
  }

  // A value saved in the workspace settings that is not a preset is still shown, so nothing is lost
  $: uses = [...INVITE_USES_PRESETS, ...(value > 0 && !INVITE_USES_PRESETS.includes(value) ? [value] : [])]
  $: items = [...uses.sort((a, b) => a - b).map(toItem), { id: UNLIMITED, label: login.string.UnlimitedUses }]
  $: selected = value < 0 ? UNLIMITED : String(value)

  function onSelected (e: CustomEvent<string>): void {
    const next = e.detail === UNLIMITED ? -1 : Number(e.detail)
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
