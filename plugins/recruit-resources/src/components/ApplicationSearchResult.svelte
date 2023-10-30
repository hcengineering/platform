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

  import { Contact, formatName } from '@hcengineering/contact'
  import { IndexedDoc, createIndexedReader, IndexedReader } from '@hcengineering/core'
  import Avatar from '@hcengineering/contact-resources/src/components/Avatar.svelte'
  import { getClient } from '@hcengineering/presentation'
  import { IconSize } from '@hcengineering/ui'
  import recruit from '@hcengineering/recruit'

  export let value: IndexedDoc

  const dispatch = createEventDispatcher()

  export let size: IconSize = 'smaller'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const valueReader = createIndexedReader(recruit.class.Applicant, hierarchy, value)
  const attachToReader = valueReader.getDoc('attachedTo') as IndexedReader<Contact>

  const shortLabel = hierarchy.getClass(value._class).shortLabel

  let title: string = ''
  let avatar: string | undefined
  let name: string = ''

  $: if (shortLabel !== undefined) {
    title = `${shortLabel}-${valueReader.get('number')}`
  } else {
    title = valueReader.get('number')
  }

  $: if (attachToReader.get('name') !== undefined) {
    name = attachToReader.get('name')[0]
  } else {
    name = ''
  }

  $: if (attachToReader.get('avatar') !== undefined) {
    avatar = attachToReader.get('avatar')[0]
  } else {
    avatar = undefined
  }

  $: dispatch('title', title)
  onMount(() => {
    dispatch('title', title)
  })
</script>

<div class="flex-row-center">
  <Avatar {avatar} {size} {name} on:accent-color />
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
