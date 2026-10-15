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
  import { type DropdownIntlItem, DropdownLabelsIntl, EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'

  import {
    HOURS_IN_DAY,
    INVITE_EXPIRATION_PRESET_HOURS,
    isValidInviteRestriction,
    isWholeDays
  } from '../inviteDuration'
  import { INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS } from '../inviteSettingsUtils'
  import settingRes from '../plugin'

  /** Expiration in hours. A negative value means the link never expires. */
  export let value: number
  export let valid: boolean = true
  export let disabled: boolean = false

  type Unit = 'hours' | 'days'

  const dispatch = createEventDispatcher()

  const items: DropdownIntlItem[] = [
    ...INVITE_EXPIRATION_PRESET_HOURS.map((hours) => ({
      id: String(hours),
      label: hours % HOURS_IN_DAY === 0 ? settingRes.string.InviteDays : settingRes.string.InviteHours,
      params: { count: hours % HOURS_IN_DAY === 0 ? hours / HOURS_IN_DAY : hours }
    })),
    { id: 'never', label: settingRes.string.InviteNever },
    { id: 'custom', label: settingRes.string.InviteCustom }
  ]

  let preset = 'custom'
  let amount: number | undefined = INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS / HOURS_IN_DAY
  let unit: Unit = 'days'
  // The value the local state was last derived from or emitted for
  let lastValue = value

  let unitItems: DropdownIntlItem[] = []
  $: unitItems = [
    { id: 'hours', label: settingRes.string.InviteHoursUnit, params: { count: amount ?? 0 } },
    { id: 'days', label: settingRes.string.InviteDaysUnit, params: { count: amount ?? 0 } }
  ]

  // Follow changes made outside of the component, e.g. settings loaded from the server
  $: if (value !== lastValue) {
    lastValue = value
    derive(value)
  }
  // Publish changes made by the user. Skipped while an outside change is waiting to be derived above,
  // so the result does not depend on the order in which Svelte runs these statements.
  $: emit(preset, amount, unit)
  $: valid = isValidInviteRestriction(value)

  function setAmount (hours: number): void {
    if (isWholeDays(hours)) {
      unit = 'days'
      amount = hours / HOURS_IN_DAY
    } else {
      unit = 'hours'
      amount = hours
    }
  }

  function derive (hours: number): void {
    if (hours < 0) {
      preset = 'never'
    } else if (INVITE_EXPIRATION_PRESET_HOURS.includes(hours)) {
      preset = String(hours)
    } else {
      preset = 'custom'
      setAmount(hours)
    }
  }

  function compute (): number {
    if (preset === 'never') return -1
    if (preset !== 'custom') return Number(preset)
    return (amount ?? 0) * (unit === 'days' ? HOURS_IN_DAY : 1)
  }

  function emit (..._deps: unknown[]): void {
    if (value !== lastValue) return
    const next = compute()
    if (next === value) return
    value = next
    lastValue = next
    dispatch('change', next)
  }

  derive(value)

  function onPreset (e: CustomEvent<string>): void {
    if (e.detail === preset) return
    if (e.detail === 'custom') {
      // Start from what is currently selected so that switching to custom changes nothing by itself
      setAmount(value > 0 ? value : INVITE_SETTINGS_DEFAULT_EXPIRATION_HOURS)
    }
    preset = e.detail
  }

  function onUnit (e: CustomEvent<Unit>): void {
    if (e.detail === unit) return
    // Keep the same duration when it converts exactly
    if (amount !== undefined) {
      if (e.detail === 'hours') amount = amount * HOURS_IN_DAY
      else if (amount % HOURS_IN_DAY === 0) amount = amount / HOURS_IN_DAY
    }
    unit = e.detail
  }
</script>

<div class="flex-col flex-gap-2 clear-mins">
  <DropdownLabelsIntl
    {items}
    selected={preset}
    {disabled}
    size={'medium'}
    width={'100%'}
    justify={'left'}
    on:selected={onPreset}
  />
  {#if preset === 'custom'}
    <div class="flex-row-center flex-gap-2">
      <div class="fill">
        <EditBox
          bind:value={amount}
          format={'number'}
          kind={'default'}
          minValue={1}
          maxDigitsAfterPoint={0}
          {disabled}
          focusable
        />
      </div>
      <div class="fill">
        <DropdownLabelsIntl
          items={unitItems}
          selected={unit}
          {disabled}
          size={'medium'}
          width={'100%'}
          justify={'left'}
          on:selected={onUnit}
        />
      </div>
    </div>
    {#if !valid}
      <span class="error-color text-sm"><Label label={settingRes.string.InvitePositiveNumber} /></span>
    {/if}
  {/if}
</div>

<style lang="scss">
  /* The amount and the unit together span the same width as the preset dropdown above */
  .fill {
    flex: 1 1 0;
    min-width: 0;
  }
</style>
