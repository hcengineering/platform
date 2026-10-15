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

  import { INVITE_DEFAULT_CUSTOM_USES, INVITE_SINGLE_USE, isValidInviteRestriction } from '../inviteDuration'
  import settingRes from '../plugin'

  /** Maximum number of uses. A negative value means the link can be used without limit. */
  export let value: number
  export let valid: boolean = true
  export let disabled: boolean = false

  const dispatch = createEventDispatcher()

  const items: DropdownIntlItem[] = [
    { id: 'unlimited', label: settingRes.string.InviteUnlimitedUses },
    { id: 'once', label: settingRes.string.InviteSingleUse },
    { id: 'custom', label: settingRes.string.InviteCustom }
  ]

  let preset = 'unlimited'
  let amount: number | undefined = INVITE_DEFAULT_CUSTOM_USES
  // The value the local state was last derived from or emitted for
  let lastValue = value

  // Follow changes made outside of the component, e.g. settings loaded from the server
  $: if (value !== lastValue) {
    lastValue = value
    derive(value)
  }
  // Publish changes made by the user. Skipped while an outside change is waiting to be derived above,
  // so the result does not depend on the order in which Svelte runs these statements.
  $: emit(preset, amount)
  $: valid = isValidInviteRestriction(value)

  function derive (uses: number): void {
    if (uses < 0) {
      preset = 'unlimited'
    } else if (uses === INVITE_SINGLE_USE) {
      preset = 'once'
    } else {
      preset = 'custom'
      amount = uses
    }
  }

  function compute (): number {
    if (preset === 'unlimited') return -1
    if (preset === 'once') return INVITE_SINGLE_USE
    return amount ?? 0
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
      amount = value > INVITE_SINGLE_USE ? value : INVITE_DEFAULT_CUSTOM_USES
    }
    preset = e.detail
  }
</script>

<div class="select">
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
    <div class="custom">
      <div class="amount">
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
      <span class="unit"><Label label={settingRes.string.InviteUsesUnit} params={{ count: amount ?? 0 }} /></span>
    </div>
    {#if !valid}
      <span class="error-color text-sm"><Label label={settingRes.string.InvitePositiveNumber} /></span>
    {/if}
  {/if}
</div>

<style lang="scss">
  .select {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-1);
    min-width: 0;
  }

  .custom {
    display: flex;
    align-items: center;
    gap: var(--spacing-1);
  }

  /* The amount fills the row so it lines up with the preset dropdown above */
  .amount {
    flex: 1 1 0;
    min-width: 0;
  }

  .unit {
    flex-shrink: 0;
    font-size: 0.8125rem;
    color: var(--theme-dark-color);
  }
</style>
