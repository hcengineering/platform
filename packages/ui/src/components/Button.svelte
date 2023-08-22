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
  import { onMount, ComponentType } from 'svelte'
  import { registerFocus } from '../focus'
  import { tooltip } from '../tooltips'
  import type {
    AnySvelteComponent,
    ButtonKind,
    ButtonShape,
    ButtonSize,
    LabelAndProps,
    IconProps,
    WidthType
  } from '../types'
  import { checkAdaptiveMatching, deviceOptionsStore as deviceInfo } from '..'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import Spinner from './Spinner.svelte'

  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: ButtonKind = 'regular'
  export let size: ButtonSize = 'medium'
  export let shape: ButtonShape = undefined
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: IconProps = {}
  export let iconRight: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconRightProps: IconProps = {}
  export let justify: 'left' | 'center' = 'center'
  export let padding: string = '0 .75rem'
  export let disabled: boolean = false
  export let loading: boolean = false
  export let width: string | undefined = undefined
  export let height: string | undefined = undefined
  export let resetIconSize: boolean = false
  export let highlight: boolean = false
  export let selected: boolean = false
  export let notSelected: boolean = false
  export let focus: boolean = false
  export let click: boolean = false
  export let title: string | undefined = undefined
  export let borderStyle: 'solid' | 'dashed' = 'solid'
  export let id: string | undefined = undefined
  export let input: HTMLButtonElement | undefined = undefined
  export let showTooltip: LabelAndProps | undefined = undefined
  export let short: boolean = false
  export let shrink: number = 0
  export let accent: boolean = false
  export let noFocus: boolean = false
  export let adaptiveShrink: WidthType | null = null

  $: iconSize =
    iconProps && iconProps.size !== undefined ? iconProps.size : size && size === 'inline' ? 'inline' : 'small'
  $: iconRightSize = iconRightProps && iconRightProps.size !== undefined ? iconRightProps.size : 'x-small'
  let iconOnly: boolean = false
  $: iconOnly =
    label === undefined &&
    $$slots.content === undefined &&
    (icon !== undefined || iconRight !== undefined || $$slots.icon || $$slots.iconRight)
  $: primary = ['accented', 'brand', 'positive', 'negative'].some((p) => p === kind)

  $: devSize = $deviceInfo.size
  $: adaptive = adaptiveShrink !== null ? checkAdaptiveMatching(devSize, adaptiveShrink) : false

  onMount(() => {
    if (focus && input) {
      input.focus()
      focus = false
    }
    if (click && input) {
      input.click()
      click = false
    }
  })

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      if (!disabled) {
        input?.focus()
      }
      return !disabled && input != null
    },
    isFocus: () => document.activeElement === input
  })

  $: if (idx !== -1 && focusManager) {
    focusManager.updateFocus(idx, focusIndex)
  }

  const updateFocus = () => {
    focusManager?.setFocus(idx)
  }
  $: if (input != null) {
    input.addEventListener('focus', updateFocus, { once: true })
  }
</script>

<!-- {focusIndex} -->
<button
  use:tooltip={showTooltip}
  bind:this={input}
  class="antiButton {kind} {size} jf-{justify} sh-{shape ?? 'no-shape'} bs-{borderStyle}"
  class:only-icon={iconOnly || adaptive}
  class:no-focus={noFocus}
  class:accent
  class:highlight
  class:selected
  class:notSelected
  class:iconL={(icon || $$slots.icon) && (label || $$slots.content)}
  class:iconR={(iconRight || $$slots.iconRight) && (label || $$slots.content)}
  disabled={disabled || loading}
  class:short
  style:width
  style:height
  style:flex-shrink={shrink}
  style:padding
  {title}
  type={kind === 'accented' ? 'submit' : 'button'}
  on:click|stopPropagation|preventDefault
  on:focus
  on:blur
  on:mousemove
  on:mouseleave
  {id}
>
  {#if icon && !loading}
    <div class="btn-icon pointer-events-none" class:resetIconSize>
      <Icon bind:icon size={iconSize} {iconProps} />
    </div>
  {/if}
  {#if loading}
    <div
      class="btn-icon pointer-events-none spinner"
      class:resetIconSize
      style:color={primary ? 'var(--accented-button-color)' : 'var(--theme-caption-color)'}
    >
      <Spinner size={iconSize === 'inline' ? 'inline' : 'small'} />
    </div>
  {/if}
  {#if label && !adaptive}
    <span class="overflow-label label disabled pointer-events-none" class:ml-2={loading}>
      <Label {label} params={labelParams} />
    </span>
  {/if}
  {#if iconRight}
    <div class="btn-right-icon pointer-events-none" class:resetIconSize>
      <Icon bind:icon={iconRight} size={iconRightSize} iconProps={iconRightProps} />
    </div>
  {/if}
  {#if $$slots.icon}<slot name="icon" />{/if}
  {#if $$slots.content}<slot name="content" />{/if}
  {#if $$slots.iconRight}<slot name="iconRight" />{/if}
</button>
