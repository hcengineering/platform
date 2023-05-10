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
  import { Asset, IntlString } from '@hcengineering/platform'
  import { tooltip } from '../tooltips'
  import type { LabelAndProps, AnySvelteComponent, AnyComponent } from '../types'
  import Component from './Component.svelte'
  import Icon from './Icon.svelte'
  import Label from './Label.svelte'
  import Menu from './Menu.svelte'

  export let component: AnySvelteComponent | AnyComponent | undefined = undefined
  export let props: any = {}
  export let options: LabelAndProps = { kind: 'submenu' }
  export let focusIndex = -1

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let text: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let labelProps: Record<string, any> = {}
  export let withHover: boolean = false
  export let element: HTMLElement | undefined = undefined

  let optionsMod: LabelAndProps
  $: optionsMod = { component: options.component ?? Menu, props, element, kind: 'submenu' }
</script>

<!-- svelte-ignore a11y-no-noninteractive-tabindex -->
<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<div
  bind:this={element}
  on:keydown
  on:mouseover
  on:click
  use:tooltip={optionsMod}
  class="antiPopup-submenu"
  class:withHover
  tabindex={focusIndex}
>
  {#if component}
    {#if typeof component === 'string'}
      <Component is={component} {props} />
    {:else}
      <svelte:component this={component} {...props} />
    {/if}
  {:else}
    {#if icon}
      <div class="icon"><Icon {icon} size={'small'} /></div>
    {/if}
    <span class="overflow-label pr-1">
      {#if label}<Label {label} params={labelProps} />
      {:else if text}{text}{/if}
    </span>
  {/if}
</div>
