<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Contact } from '@hcengineering/contact'
  import type { Class, DocumentQuery, Ref } from '@hcengineering/core'
  import type { IntlString } from '@hcengineering/platform'
  import { createQuery } from '@hcengineering/presentation'
  import { Button, ButtonKind, ButtonSize, Label, showPopup, TooltipAlignment } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ContactPresenter } from '..'
  import contact from '../plugin'
  import CombineAvatars from './CombineAvatars.svelte'
  import IconMembers from './icons/Members.svelte'
  import UsersPopup from './UsersPopup.svelte'

  export let items: Ref<Contact>[] = []
  export let _class: Ref<Class<Contact>> = contact.class.Contact
  export let label: IntlString
  export let docQuery: DocumentQuery<Contact> | undefined = {}

  export let kind: ButtonKind = 'no-border'
  export let size: ButtonSize = 'small'
  export let justify: 'left' | 'center' = 'center'
  export let width: string | undefined = undefined
  export let labelDirection: TooltipAlignment | undefined = undefined
  export let emptyLabel = contact.string.Contacts
  export let readonly: boolean = false

  let contacts: Contact[] = []

  const query = createQuery()

  $: query.query<Contact>(_class, { _id: { $in: items } }, (result) => {
    contacts = result
  })

  const dispatch = createEventDispatcher()

  async function addPerson (evt: Event): Promise<void> {
    showPopup(
      UsersPopup,
      {
        _class,
        label,
        docQuery,
        multiSelect: true,
        allowDeselect: false,
        selectedUsers: items,
        readonly
      },
      evt.target as HTMLElement,
      undefined,
      (result) => {
        if (result != null) {
          items = result
          dispatch('update', items)
        }
      }
    )
  }
</script>

<Button
  icon={contacts.length === 0 ? IconMembers : undefined}
  label={contacts.length === 0 ? emptyLabel : undefined}
  notSelected={contacts.length === 0}
  width={width ?? 'min-content'}
  {kind}
  {size}
  {justify}
  showTooltip={{ label, direction: labelDirection }}
  on:click={addPerson}
>
  <svelte:fragment slot="content">
    {#if contacts.length > 0}
      <div class="flex-row-center flex-nowrap pointer-events-none">
        {#if contacts.length === 1}
          <ContactPresenter value={contacts[0]} disabled />
        {:else}
          <CombineAvatars {_class} bind:items size={'inline'} hideLimit />
          <span class="overflow-label ml-1-5">
            <Label label={contact.string.NumberMembers} params={{ count: contacts.length }} />
          </span>
        {/if}
      </div>
    {/if}
  </svelte:fragment>
</Button>
