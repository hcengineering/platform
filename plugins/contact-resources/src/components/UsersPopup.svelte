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
  import contact, { Contact, getFirstName, getLastName, Person } from '@hcengineering/contact'
  import type { Class, Doc, DocumentQuery, FindOptions, Ref } from '@hcengineering/core'
  import type { Asset, IntlString } from '@hcengineering/platform'
  import presentation, { getClient, ObjectCreate, ObjectPopup } from '@hcengineering/presentation'
  import { AnySvelteComponent, Label } from '@hcengineering/ui'
  import UserInfo from './UserInfo.svelte'
  import { createEventDispatcher } from 'svelte'

  export let _class: Ref<Class<Contact>>
  export let options: FindOptions<Contact> | undefined = undefined
  export let selected: Ref<Person> | undefined
  export let docQuery: DocumentQuery<Contact> | undefined = undefined

  const client = getClient()

  export let filter: (it: Doc) => boolean = (it) => {
    if (client.getHierarchy().hasMixin(it, contact.mixin.Employee)) {
      return client.getHierarchy().as(it, contact.mixin.Employee).active
    }
    return true
  }

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

  const hierarchy = getClient().getHierarchy()
  const dispatch = createEventDispatcher()

  $: _create =
    create !== undefined
      ? {
          ...create,
          update: (doc: Doc) => {
            const name = getFirstName((doc as Contact).name).split(' ')[0]
            return name.length > 0 ? name : getLastName((doc as Contact).name).split(' ')[0]
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
  {filter}
  groupBy={'_class'}
  bind:selectedObjects={selectedUsers}
  bind:ignoreObjects={ignoreUsers}
  {shadows}
  create={_create}
  on:update
  on:close
  on:changeContent
  on:created={(doc) => dispatch('close', doc.detail)}
  {readonly}
>
  <svelte:fragment slot="item" let:item={person}>
    <div class="flex flex-grow overflow-label">
      <UserInfo size={'smaller'} value={person} {icon} />
    </div>
  </svelte:fragment>

  <svelte:fragment slot="category" let:item={person}>
    {@const cl = hierarchy.getClass(person._class)}
    <div class="menu-group__header">
      <span class="overflow-label">
        <Label label={cl.label} />
      </span>
    </div>
  </svelte:fragment>
</ObjectPopup>
