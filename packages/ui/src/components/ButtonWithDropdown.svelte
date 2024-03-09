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
  import { Asset, IntlString } from '@hcengineering/platform'
  import {
    AnySvelteComponent,
    Button,
    ButtonKind,
    Icon,
    Label,
    SelectPopup,
    SelectPopupValueType,
    eventToHTMLElement,
    showPopup,
    LabelAndProps,
    ButtonSize
  } from '../index'
  import { createEventDispatcher } from 'svelte'

  export let dropdownItems: SelectPopupValueType[]
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: ButtonKind = 'primary'
  export let size: ButtonSize = 'medium'
  export let justify: 'left' | 'center' = 'center'
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let dropdownIcon: Asset | AnySvelteComponent | undefined = undefined
  export let showTooltipMain: LabelAndProps | undefined = undefined
  export let mainButtonId: string | undefined = undefined
  export let disabled: boolean = false
  export let loading: boolean = false
  export let focusIndex: number | undefined = undefined

  const dispatch = createEventDispatcher()

  function openDropdown (ev: MouseEvent): void {
    showPopup(SelectPopup, { value: dropdownItems }, eventToHTMLElement(ev), (res) => {
      dispatch('dropdown-selected', res)
    })
  }
</script>

<div class="w-full flex-row-center">
  <div class="flex-grow">
    <Button
      {focusIndex}
      width="100%"
      {icon}
      {size}
      {kind}
      disabled={disabled || loading}
      shape="rectangle-right"
      {justify}
      borderStyle="none"
      on:click
      showTooltip={showTooltipMain}
      id={mainButtonId}
    >
      <div class="flex w-full" slot="content">
        <div class="flex-row-center w-full flex-between relative">
          {#if label}
            <Label {label} params={labelParams} />
            <slot name="content" />
            <div class="{kind} vertical-divider max-h-5 h-5" />
          {/if}
        </div>
      </div>
    </Button>
  </div>
  <Button
    width="1.75rem"
    {kind}
    shape="rectangle-left"
    justify="center"
    borderStyle="none"
    on:click={openDropdown}
    {size}
    {disabled}
    {loading}
  >
    <div slot="icon">
      {#if dropdownIcon}
        <Icon icon={dropdownIcon} size="small" />
      {/if}
    </div>
  </Button>
</div>

<style lang="scss">
  .vertical-divider {
    position: absolute;
    background-color: var(--theme-content-color);
    min-width: 1px;
    opacity: 0.25;
    right: -0.75rem;

    &.primary,
    &.secondary,
    &.positive,
    &.negative,
    &.dangerous,
    &.contrast {
      background-color: var(--primary-button-content-color);
    }
  }
</style>
