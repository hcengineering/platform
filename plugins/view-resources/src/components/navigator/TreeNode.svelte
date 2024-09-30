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
  import { Doc, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import type { Action, AnySvelteComponent } from '@hcengineering/ui'
  import TreeElement from './TreeElement.svelte'

  export let _id: Ref<Doc> | string | undefined = undefined
  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let folderIcon: boolean = false
  export let iconProps: Record<string, any> | undefined = undefined
  export let actions: () => Promise<Action[]> = async () => []
  export let notifications: number = 0
  export let parent: boolean = true
  export let type: 'default' | 'nested' | 'nested-selectable' = 'default'
  export let isFold: boolean = false
  export let empty: boolean = false
  export let visible: boolean = false
  export let collapsed: boolean = false
  export let collapsedPrefix: string = ''
  export let highlighted: boolean = false
  export let selected: boolean = false
  export let showMenu: boolean = false
  export let noDivider: boolean = false
  export let shouldTooltip: boolean = false
  export let forciblyСollapsed: boolean = false
</script>

<TreeElement
  {_id}
  {title}
  {label}
  {iconProps}
  {icon}
  {folderIcon}
  {notifications}
  bind:collapsed
  {collapsedPrefix}
  {actions}
  {type}
  {isFold}
  {empty}
  {visible}
  {parent}
  {highlighted}
  {selected}
  {shouldTooltip}
  {showMenu}
  {noDivider}
  {forciblyСollapsed}
  on:click
  on:dragover
  on:drop
>
  <slot />
  <svelte:fragment slot="extra"><slot name="extra" /></svelte:fragment>
  <svelte:fragment slot="visible"><slot name="visible" /></svelte:fragment>
</TreeElement>
