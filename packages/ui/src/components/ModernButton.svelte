<script lang="ts">
  //
  // © 2023 Hardcore Engineering, Inc. All Rights Reserved.
  // Licensed under the Eclipse Public License v2.0 (SPDX: EPL-2.0).
  //

  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, ButtonBaseSize, IconSize, LabelAndProps } from '../types'
  import { ComponentType } from 'svelte'
  import ButtonBase from './ButtonBase.svelte'

  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelParams: Record<string, any> = {}
  export let kind: 'primary' | 'secondary' | 'tertiary' | 'negative' = 'secondary'
  export let size: ButtonBaseSize = 'large'
  export let shape: 'rectangle' | 'round' = 'rectangle'
  export let icon: Asset | AnySvelteComponent | ComponentType | undefined = undefined
  export let iconProps: any | undefined = undefined
  export let iconSize: IconSize | undefined = undefined
  export let disabled: boolean = false
  export let loading: boolean = false
  export let pressed: boolean = false
  export let hasMenu: boolean = false
  export let noPrint: boolean = false
  export let autoFocus: boolean = false
  export let inheritFont: boolean = false
  export let focusIndex = -1
  export let tooltip: LabelAndProps | undefined = undefined
  export let element: HTMLButtonElement | undefined = undefined
  export let id: string | undefined = undefined
  export let dataId: string | undefined = undefined
</script>

<ButtonBase
  bind:element
  type={'type-button'}
  {title}
  {shape}
  {label}
  {labelParams}
  {kind}
  {size}
  {icon}
  {iconProps}
  {iconSize}
  {loading}
  {disabled}
  {pressed}
  {hasMenu}
  {noPrint}
  {inheritFont}
  {focusIndex}
  {tooltip}
  {autoFocus}
  {id}
  {dataId}
  on:click
>
  <slot />
</ButtonBase>
