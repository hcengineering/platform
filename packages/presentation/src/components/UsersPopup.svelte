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
  import { afterUpdate, createEventDispatcher } from 'svelte'

  import ui, { Label, EditWithIcon, IconSearch } from '@anticrm/ui'
  import UserInfo from './UserInfo.svelte'

  import type { Ref, Class } from '@anticrm/core'
  import type { Person } from '@anticrm/contact'
  import { createQuery } from '../utils'
  import presentation from '..'
  import { ActionIcon, IconBlueCheck } from '@anticrm/ui'

  export let _class: Ref<Class<Person>>
  export let title: IntlString
  export let caption: IntlString = ui.string.Suggested
  export let selected: Ref<Person> | undefined

  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined

  export let ignoreUsers: Ref<Person>[] = []

  let search: string = ''
  let objects: Person[] = []

  const dispatch = createEventDispatcher()
  const query = createQuery()
  $: query.query<Person>(_class, { name: { $like: '%' + search + '%' }, _id: { $nin: ignoreUsers } }, result => { objects = result }, { limit: 200 })
  afterUpdate(() => { dispatch('update', Date.now()) })
</script>

<div class="antiPopup antiPopup-withHeader antiPopup-withTitle">
  <div class="ap-title"><Label label={title} /></div>
  <div class="ap-header">
    <EditWithIcon icon={IconSearch} bind:value={search} placeholder={ui.string.SearchDots} focus />
    <div class="ap-caption"><Label label={caption} /></div>
  </div>
  <div class="ap-space" />
  <div class="ap-scroll">
    <div class="ap-box">
      {#each objects as person}
        <button class="ap-menuItem withCheck" on:click={() => { dispatch('close', person) }}>
          <UserInfo size={'medium'} value={person} />
          {#if allowDeselect && person._id === selected}
            <div class="ap-check">
              <ActionIcon direction={'top'} label={titleDeselect ?? presentation.string.Deselect} icon={IconBlueCheck} action={() => { dispatch('close', null) }} size={'small'} />
            </div>
          {/if}
        </button>
      {/each}
    </div>
  </div>
  <div class="ap-space" />
</div>
