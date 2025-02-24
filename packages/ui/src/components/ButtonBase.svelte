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
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, ButtonBaseKind, ButtonBaseSize, ButtonBaseType, IconSize, LabelAndProps } from '../types'
  import { tooltip as tp } from '../tooltips'
  import { registerFocus } from '../focus'
  import { ComponentType, onMount } from 'svelte'
  import Spinner from './Spinner.svelte'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'

  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconSize: IconSize | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let kind: ButtonBaseKind
  export let size: ButtonBaseSize
  export let disabled: boolean = false
  export let loading: boolean = false
  export let pressed: boolean = false
  export let hasMenu: boolean = false
  export let noPrint: boolean = false
  export let autoFocus: boolean = false
  export let type: ButtonBaseType
  export let inheritColor: boolean = false
  export let inheritFont: boolean = false
  export let tooltip: LabelAndProps | undefined = undefined
  export let element: HTMLButtonElement | undefined = undefined
  export let shape: 'rectangle' | 'round' = 'rectangle'
  export let id: string | undefined = undefined
  export let dataId: string | undefined = undefined

  let actualIconSize: IconSize = 'small'

  $: if (iconSize) {
    actualIconSize = iconSize
  } else if (type === 'type-button' && !hasMenu) {
    actualIconSize = 'medium'
  }
  $: iconOnly = title === undefined && label === undefined && $$slots.default === undefined && icon !== undefined

  export function focus () {
    element?.focus()
  }

  onMount(() => {
    if (autoFocus && element) {
      element.focus()
      autoFocus = false
    }
  })

  // Focusable control with index
  export let focusIndex = -1
  const { idx, focusManager } = registerFocus(focusIndex, {
    focus: () => {
      if (!disabled) {
        element?.focus()
      }
      return !disabled && element != null
    },
    isFocus: () => document.activeElement === element
  })

  $: if (idx !== -1 && focusManager) {
    focusManager.updateFocus(idx, focusIndex)
  }

  const updateFocus = () => {
    focusManager?.setFocus(idx)
  }
  $: if (element != null) {
    element.addEventListener('focus', updateFocus, { once: true })
  }
</script>

<button
  {id}
  bind:this={element}
  class="hulyButton font-medium-14 {kind} {size} {type} {shape}"
  class:loading
  class:pressed
  class:inheritColor
  class:inheritFont
  class:menu={hasMenu}
  class:iconOnly
  class:no-print={noPrint}
  disabled={loading || disabled}
  data-id={dataId}
  use:tp={tooltip}
  on:click|stopPropagation|preventDefault
  on:keydown
>
  {#if loading}
    <div class="icon no-gap"><Spinner size={'small'} /></div>
  {:else if icon}
    <div class="icon no-gap"><Icon {icon} {iconProps} size={actualIconSize} /></div>
  {/if}
  {#if label}<span><Label {label} params={labelParams} /></span>{/if}
  {#if title}<span>{title}</span>{/if}
  <slot />
</button>
