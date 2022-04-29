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
  import { createEventDispatcher, onMount } from 'svelte'

  import { Tooltip, CheckBox } from '@anticrm/ui'
  import UserInfo from './UserInfo.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import type { Person } from '@anticrm/contact'
  import { createQuery } from '../utils'
  import presentation from '..'

  export let _class: Ref<Class<Person>>
  export let selected: Ref<Person> | undefined

  export let multiSelect: boolean = false
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedUsers: Ref<Person>[] = []
  export let ignoreUsers: Ref<Person>[] = []

  let search: string = ''
  let objects: Person[] = []
  let input: HTMLInputElement

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query<Person>(
    _class,
    { name: { $like: '%' + search + '%' }, _id: { $nin: ignoreUsers } },
    (result) => {
      objects = result
    },
    { limit: 200 }
  )

  let phTraslate: string = ''
  $: if (placeholder) {
    translate(placeholder, {}).then((res) => {
      phTraslate = res
    })
  }

  const isSelected = (person: Person): boolean => {
    if (selectedUsers.filter((p) => p === person._id).length > 0) return true
    return false
  }
  const checkSelected = (person: Person): void => {
    if (isSelected(person)) selectedUsers = selectedUsers.filter((p) => p !== person._id)
    else selectedUsers.push(person._id)
    objects = objects
    dispatch('update', selectedUsers)
  }
  onMount(() => {
    if (input) input.focus()
  })
</script>

<div class="selectPopup">
  <div class="header">
    <input bind:this={input} type="text" bind:value={search} placeholder={phTraslate} on:change />
  </div>
  <div class="scroll">
    <div class="box">
      {#each objects as person}
        <button
          class="menu-item"
          on:click={() => {
            if (!multiSelect) {
              selected = person._id === selected ? undefined : person._id
              dispatch('close', selected !== undefined ? person : undefined)
            } else checkSelected(person)
          }}
        >
          {#if multiSelect}
            <div class="check pointer-events-none">
              <CheckBox checked={isSelected(person)} primary />
            </div>
          {/if}
          <UserInfo size={'x-small'} value={person} />
          {#if allowDeselect && person._id === selected}
            <div class="check-right pointer-events-none">
              {#if titleDeselect}
                <Tooltip label={titleDeselect ?? presentation.string.Deselect}>
                  <CheckBox checked circle primary />
                </Tooltip>
              {:else}
                <CheckBox checked circle primary />
              {/if}
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
</div>
