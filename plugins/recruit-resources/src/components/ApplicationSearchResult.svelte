<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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

  import { formatName } from '@hcengineering/contact'
  import { SearchResultDoc } from '@hcengineering/core'
  import Avatar from '@hcengineering/contact-resources/src/components/Avatar.svelte'
  import { getClient } from '@hcengineering/presentation'
  import { IconSize } from '@hcengineering/ui'

  export let value: SearchResultDoc

  const dispatch = createEventDispatcher()

  export let size: IconSize = 'smaller'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const shortLabel = hierarchy.getClass(value._class).shortLabel

  let title: string = ''
  let name: string = ''

  $: if (shortLabel !== undefined) {
    title = `${shortLabel}-${value.number}`
  } else {
    title = `${value.number}`
  }

  $: if (value.attachedToName !== undefined) {
    name = value.attachedToName
  } else {
    name = ''
  }

  $: dispatch('title', title)
  onMount(() => {
    dispatch('title', title)
  })
</script>

<div class="flex-row-center">
  <Avatar avatar={value.attachedToAvatar} {size} {name} on:accent-color />
  <span class="ml-2 title">
    {title}
  </span>
  <span>{formatName(name)}</span>
</div>

<style lang="scss">
  .title {
    margin-right: 0.5rem;
    color: var(--theme-darker-color);
  }
</style>
