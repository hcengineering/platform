<!--
//
// Copyright © 2024 Hardcore Engineering Inc.
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
//
-->

<script lang="ts">
  import contact, { Contact, PersonAccount } from '@hcengineering/contact'
  import { Ref } from '@hcengineering/core'
  import { CollaborationUser } from '../types'
  import { Button, Component } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'

  export let value: CollaborationUser
  export let lastUpdate: number

  const client = getClient()

  let avatar: Component | undefined
  $: lastUpdate !== 0 && avatar?.pulse()

  let person: Contact | undefined
  $: account = value.id as Ref<PersonAccount>
  $: void fetchPerson(account)

  async function fetchPerson (accountRef: Ref<PersonAccount>): Promise<void> {
    const account = await client.findOne(contact.class.PersonAccount, { _id: accountRef })
    if (account !== undefined) {
      person = await client.findOne(contact.class.Contact, { _id: account?.person })
    } else {
      person = undefined
    }
  }
</script>

{#if person}
  <Button kind="icon" shape="round-small" padding="0" size="x-small" noFocus on:click>
    <svelte:fragment slot="icon">
      <Component
        bind:innerRef={avatar}
        is={contact.component.Avatar}
        props={{
          size: 'x-small',
          avatar: person.avatar,
          name: person.name,
          borderColor: value.color
        }}
      />
    </svelte:fragment>
  </Button>
{/if}
