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
  import type { Asset, IntlString } from '@anticrm/platform'
  import type { Action } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import TreeElement from './TreeElement.svelte'

  export let _id: string
  export let icon: Asset | undefined = undefined
  export let label: IntlString | undefined = undefined
  export let title: string | undefined = undefined
  export let notifications = 0
  export let actions: () => Promise<Action[]> = async () => []
  export let selected: boolean = false

  const dispatch = createEventDispatcher()

</script>

<TreeElement {_id} {icon} {label} {title} {notifications} {selected} {actions} collapsed on:click={() => { dispatch('click') }}/>
