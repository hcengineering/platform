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
  import type { IntlString } from '@anticrm/platform'
  import { onDestroy } from 'svelte'
  import type { TooltipAlignment, AnySvelteComponent, AnyComponent } from '../types'
  import { tooltipstore as tooltip, showTooltip } from '..'

  export let label: IntlString | undefined = undefined
  export let direction: TooltipAlignment | undefined = undefined
  export let component: AnySvelteComponent | AnyComponent | undefined = undefined
  export let props: any | undefined = undefined
  export let anchor: HTMLElement | undefined = undefined
  export let onUpdate: ((result: any) => void) | undefined = undefined
  export let fill = false

  let triggerHTML: HTMLElement
  let shown: boolean = false
  $: shown = !!($tooltip.label || $tooltip.component)

  let toHandler: number = -1

  onDestroy(() => clearTimeout(toHandler))
</script>

<div
  class="tooltip-trigger"
  class:fill
  name={`tooltip-${label}`}
  bind:this={triggerHTML}
  on:mouseleave={() => {
    clearTimeout(toHandler)
  }}
  on:mousemove={() => {
    if (!shown) {
      clearTimeout(toHandler)
      toHandler = setTimeout(() => {
        showTooltip(label, triggerHTML, direction, component, props, anchor, onUpdate)
      }, 250)
    }
  }}
>
  <slot />
</div>

<style lang="scss">
  .tooltip-trigger {
    width: fit-content;
    &.fill {
      width: 100%;
      height: 100%;
    }
  }
</style>
