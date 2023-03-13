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
  import { Contact, getFirstName, Person } from '@hcengineering/contact'
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import { AnySvelteComponent, Icon, Label } from '@hcengineering/ui'
  import presentation from '..'
  import { getClient } from '../utils'
  import ObjectPopup from './ObjectPopup.svelte'
  import UserInfo from './UserInfo.svelte'
  import { ObjectCreate } from '../types'

  export let _class: Ref<Class<Contact>>
  export let options: FindOptions<Contact> | undefined = undefined
  export let selected: Ref<Person> | undefined
  export let docQuery: DocumentQuery<Contact> | undefined = undefined

  export let multiSelect: boolean = false
  export let allowDeselect: boolean = false
  export let titleDeselect: IntlString | undefined = undefined
  export let placeholder: IntlString = presentation.string.Search
  export let selectedUsers: Ref<Person>[] = []
  export let ignoreUsers: Ref<Person>[] = []
  export let shadows: boolean = true
  export let icon: Asset | AnySvelteComponent | undefined = undefined
  export let create: ObjectCreate | undefined = undefined
  export let readonly = false
  export let preselect: ((itemId: Ref<Doc>, select: () => void) => void) | undefined = undefined

  const hierarchy = getClient().getHierarchy()

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => {
            const name = getFirstName((doc as Contact).name)
            return name.length > 0 ? name : (doc as Contact).name
          }
        }
      : undefined
</script>

<ObjectPopup
  {_class}
  {options}
  {selected}
  {multiSelect}
  {allowDeselect}
  {titleDeselect}
  {placeholder}
  {docQuery}
  groupBy={'_class'}
  bind:selectedObjects={selectedUsers}
  bind:ignoreObjects={ignoreUsers}
  {shadows}
  create={_create}
  on:update
  on:close
  on:changeContent
  {readonly}
  {preselect}
>
  <svelte:fragment slot="item" let:item={person}>
    <div class="flex flex-grow overflow-label">
      <UserInfo size={'x-small'} value={person} {icon} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={person}>
    {@const cl = hierarchy.getClass(person._class)}
    <div class="flex flex-grow overflow-label">
      <span class="fs-medium flex-center gap-2 mt-2 mb-2 ml-2">
        {#if cl.icon}
          <Icon icon={cl.icon} size={'small'} />
        {/if}
        <Label label={cl.label} />
      </span>
    </div>
  </svelte:fragment>
</ObjectPopup>
