<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { ComponentType } from 'svelte'
  import { tooltip } from '../tooltips'
  import type { AnySvelteComponent, ButtonBaseSize, IconProps, LabelAndProps } from '../types'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import Spinner from './Spinner.svelte'

  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let title: string | undefined = undefined
  export let secondTitle: string | undefined = undefined
  export let kind: 'secondary' | 'primary' = 'secondary'
  export let size: ButtonBaseSize = 'medium'
  export let disabled: boolean = false
  export let loading: boolean = false
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: IconProps = {}
  export let secondIcon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let secondIconProps: IconProps = {}
  export let width: string | undefined = undefined
  export let height: string | undefined = undefined
  export let pressed: boolean = false
  export let secondPressed: boolean = false
  export let showTooltip: LabelAndProps | undefined = undefined
  export let secondShowTooltip: LabelAndProps | undefined = undefined
  export let action: (e: MouseEvent) => void = () => {}
  export let secondAction: (e: MouseEvent) => void = () => {}
  export let noFocus: boolean = false
  export let separate: boolean = false

  $: iconSize = iconProps?.size !== undefined ? iconProps.size : 'full'
  $: secondIconSize = secondIconProps?.size !== undefined ? secondIconProps.size : 'full'
</script>

<div
  class="hulySplitButton-container {kind} {size}"
  class:no-focus={noFocus}
  class:disabled
  class:separate
  style:width
  style:height
>
  {#if loading}
    <Spinner size={iconSize === 'inline' ? 'inline' : 'small'} />
  {:else}
    <button
      use:tooltip={showTooltip}
      class="hulySplitButton-main"
      class:pressed
      {disabled}
      {title}
      type={kind === 'primary' ? 'submit' : 'button'}
      on:click|stopPropagation={action}
    >
      {#if icon || $$slots.icon}
        <div class="btn-icon pointer-events-none">
          {#if icon}<Icon bind:icon size={iconSize} {iconProps} />{/if}
          {#if $$slots.icon}<slot name="icon" />{/if}
        </div>
      {/if}
      {#if label}
        <span class="overflow-label label pointer-events-none">
          <Label {label} params={labelParams} />
        </span>
      {/if}
      {#if $$slots.content}<slot name="content" />{/if}
    </button>
    <button
      use:tooltip={secondShowTooltip}
      class="hulySplitButton-second"
      class:pressed={secondPressed}
      {disabled}
      title={secondTitle}
      on:click|stopPropagation={secondAction}
    >
      {#if secondIcon || $$slots.secondIcon}
        <div class="btn-icon pointer-events-none">
          {#if secondIcon}<Icon bind:icon={secondIcon} size={secondIconSize} iconProps={secondIconProps} />{/if}
          {#if $$slots.secondIcon}<slot name="secondIcon" />{/if}
        </div>
      {/if}
    </button>
  {/if}
</div>
