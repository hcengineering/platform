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
  import { onMount } from 'svelte'
  import type { IntlString, Asset } from '@anticrm/platform'

  import Label from './Label.svelte'
  import Icon from './Icon.svelte'
  import { showPopup, Button, Tooltip, DropdownPopup } from '..'
  import type { AnySvelteComponent, ListItem, TooltipAlignment } from '../types'

  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let label: IntlString
  export let placeholder: IntlString
  export let items: ListItem[] = []
  export let selected: ListItem | undefined = undefined

  export let kind: 'primary' | 'secondary' | 'no-border' | 'transparent' | 'link' | 'dangerous' = 'no-border'
  export let size: 'small' | 'medium' | 'large' | 'x-large' = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined

  let container: HTMLElement
  let opened: boolean = false
</script>

<div bind:this={container} class="min-w-0">
  <Tooltip label={label} fill={width === '100%'} direction={labelDirection}>
    <Button
      {icon}
      width={width ?? 'min-content'}
      {size} {kind} {justify}
      on:click={() => {
        if (!opened) {
          opened = true
          showPopup(DropdownPopup, { title: label, items, icon }, container, (result) => {
            if (result) selected = result
            opened = false
          })
        }
      }}
    >
      <span slot="content" style="overflow: hidden">
        {#if selected}{selected.label}{:else}<Label label={placeholder} />{/if}
      </span>
    </Button>
  </Tooltip>
</div>
