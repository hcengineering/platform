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
  import { createEventDispatcher, onMount } from 'svelte'

  import Avatar from './Avatar.svelte'

  import { formatName } from '@hcengineering/contact'
  import { SearchResultDoc } from '@hcengineering/core'
  import { IconSize } from '@hcengineering/ui'

  export let value: SearchResultDoc

  export let size: IconSize = 'smaller'
  export let short: boolean = false

  const dispatch = createEventDispatcher()

  let title: string
  $: if (value.name !== undefined) {
    title = formatName(value.name)
  } else {
    title = ''
  }

  $: dispatch('title', title)
  onMount(() => {
    dispatch('title', title)
  })
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="flex-row-center" on:click>
  <Avatar avatar={value.avatar} {size} name={value.name} on:accent-color />
  <div class="flex-col min-w-0 {size === 'tiny' || size === 'inline' ? 'ml-1' : 'ml-2'}" class:max-w-20={short}>
    <div class="label overflow-label text-left">{title}</div>
  </div>
</div>
