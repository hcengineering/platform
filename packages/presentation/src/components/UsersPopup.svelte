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
  import type { IntlString } from '@anticrm/platform'
  import { translate } from '@anticrm/platform'
  import { afterUpdate, createEventDispatcher } from 'svelte'

  import { Tooltip, CheckBox } from '@anticrm/ui'
  import UserInfo from './UserInfo.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import type { Person } from '@anticrm/contact'
  import { createQuery } from '../utils'
  import presentation from '..'

  export let _class: Ref<Class<Person>>
  export let selected: Ref<Person> | undefined

  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search

  export let ignoreUsers: Ref<Person>[] = []

  let search: string = ''
  let objects: Person[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query<Person>(_class, { name: { $like: '%' + search + '%' }, _id: { $nin: ignoreUsers } }, result => { objects = result }, { limit: 200 })

  let phTraslate: string = ''
  $: if (placeholder) translate(placeholder, {}).then(res => { phTraslate = res })
  afterUpdate(() => { dispatch('update', Date.now()) })
</script>

<div class="selectPopup">
  <div class="header">
    <input type='text' bind:value={search} placeholder={phTraslate} on:input={(ev) => { }} on:change/>
  </div>
  <div class="scroll">
    <div class="box">
      {#each objects as person}
        <button class="menu-item flex-between" on:click={() => { dispatch('close', person) }}>
          <UserInfo size={'x-small'} value={person} />
          {#if allowDeselect && person._id === selected}
            <div class="check" on:click|stopPropagation={() => { dispatch('close', null) }}>
              <Tooltip label={titleDeselect ?? presentation.string.Deselect}>
                <CheckBox checked primary />
              </Tooltip>
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
