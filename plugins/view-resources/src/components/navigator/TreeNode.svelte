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

  export let _id: Ref<Doc> | undefined = undefined
  export let title: string | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let actions: () => Promise<Action[]> = async () => []
  export let notifications = 0
  export let parent = false
  export let collapsed = false
  export let shortDropbox = false
  export let indent: 'default' | 'ml-2' | 'ml-4' | 'ml-8' = 'default'
</script>

<TreeElement
  {_id}
  {title}
  {label}
  {iconProps}
  {icon}
  {notifications}
  {collapsed}
  {actions}
  node
  {parent}
  {indent}
  {shortDropbox}
  on:click
>
  <slot />
</TreeElement>
