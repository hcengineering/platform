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
  import type { Doc, Ref } from '@hcengineering/core'
  import type { Asset } from '@hcengineering/platform'
  import type { Action, IconSize } from '@hcengineering/ui'
  import TreeElement from './TreeElement.svelte'
  import { AnySvelteComponent } from '@hcengineering/ui'

  export let _id: Ref<Doc>
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let iconProps: Record<string, any> | undefined = undefined
  export let iconSize: IconSize = 'small'
  export let title: string
  export let notifications = 0
  export let actions: (originalEvent?: MouseEvent) => Promise<Action[]> = async () => []
  export let selected: boolean = false
  export let bold: boolean = false
  export let indent: boolean = false
  export let showNotify: boolean = false
</script>

<TreeElement
  {_id}
  {icon}
  {iconSize}
  {title}
  {notifications}
  {selected}
  {actions}
  {iconProps}
  {bold}
  {indent}
  {showNotify}
  collapsed
  on:click
/>
