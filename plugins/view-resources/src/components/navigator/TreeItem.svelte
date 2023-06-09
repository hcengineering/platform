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
  import type { Action } from '@hcengineering/ui'
  import TreeElement from './TreeElement.svelte'

  export let _id: Ref<Doc>
  export let icon: Asset | undefined = undefined
  export let title: string
  export let notifications = 0
  export let actions: (originalEvent?: MouseEvent) => Promise<Action[]> = async () => []
  export let selected: boolean = false
  export let bold = false
  export let indent: 'default' | 'ml-2' | 'ml-4' | 'ml-8' = 'default'
</script>

<TreeElement {_id} {icon} {title} {notifications} {selected} {actions} {bold} collapsed {indent} on:click />
