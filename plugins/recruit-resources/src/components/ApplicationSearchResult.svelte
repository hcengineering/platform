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

  import contact, { formatName } from '@hcengineering/contact'
  import { IndexedDoc, docKey } from '@hcengineering/core'
  import Avatar from '@hcengineering/contact-resources/src/components/Avatar.svelte'
  import { getClient } from '@hcengineering/presentation'
  import task from '@hcengineering/task'
  import { IconSize } from '@hcengineering/ui'

  export let value: IndexedDoc

  const dispatch = createEventDispatcher()

  export let size: IconSize = 'smaller'

  const keys = {
    number: docKey('number', { _class: task.class.Task }),
    name: '|' + docKey('name', { _class: contact.class.Contact }),
    avatar: '|' + docKey('avatar', { _class: contact.class.Contact })
  }

  const client = getClient()
  const shortLabel = client.getHierarchy().getClass(value._class).shortLabel

  let title: string = ''
  let avatar: string | undefined

  $: if (shortLabel !== undefined) {
    title = `${shortLabel}-${value[keys.number]}`
  } else {
    title = value[keys.number]
  }

  $: if (value[keys.avatar] !== undefined) {
    avatar = value[keys.avatar][0]
  } else {
    avatar = undefined
  }

  $: dispatch('title', title)
  onMount(() => {
    dispatch('title', title)
  })
</script>

<div class="flex-row-center">
  <Avatar avatar={avatar} {size} name={value[keys.name][0]} on:accent-color />
  <span class="ml-2 title">
    {title}
  </span>
  <span>{formatName(value[keys.name][0])}</span>
</div>

<style lang="scss">
  .title {
    margin-right: 0.5rem;
    color: var(--theme-darker-color);
  }
</style>