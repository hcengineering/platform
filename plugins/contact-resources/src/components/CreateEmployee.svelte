<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Channel, combineName, Employee, Person, PersonAccount } from '@hcengineering/contact'
  import core, { AccountRole, AttachedData, Data, generateId, Ref } from '@hcengineering/core'
  import login from '@hcengineering/login'
  import { getResource } from '@hcengineering/platform'
  import { Card, createQuery, getClient } from '@hcengineering/presentation'
  import { createFocusManager, EditBox, FocusHandler, IconInfo, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ChannelsDropdown } from '..'
  import contact from '../plugin'
  import EditableAvatar from './EditableAvatar.svelte'

  export let canSave: boolean = true
  export let onCreate: ((id: Ref<Employee>) => Promise<void>) | undefined = undefined

  let avatarEditor: EditableAvatar

  let firstName = ''
  let lastName = ''
  let email = ''

  const id: Ref<Employee> = generateId()

  export function canClose (): boolean {
    return firstName === '' && lastName === '' && email === ''
  }

  const object: Employee = {} as Employee

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createPerson () {
    changeEmail()
    const name = combineName(firstName, lastName)
    const person: Data<Person> = {
      name,
      city: object.city
    }

    person.avatar = await avatarEditor.createAvatar()

    await client.createDoc(contact.class.Person, contact.space.Contacts, person, id)
    await client.createMixin(id, contact.class.Person, contact.space.Contacts, contact.mixin.Employee, {
      active: true
    })

    const mail = email.trim()

    await client.createDoc(contact.class.PersonAccount, core.space.Model, {
      email: mail,
      person: id,
      role: AccountRole.User
    })

    const sendInvite = await getResource(login.function.SendInvite)
    await sendInvite(email.trim())

    for (const channel of channels) {
      await client.addCollection(contact.class.Channel, contact.space.Contacts, id, contact.class.Person, 'channels', {
        value: channel.value,
        provider: channel.provider
      })
    }
    if (onCreate) {
      await onCreate(id)
    }
    dispatch('close')
  }

  let channels: AttachedData<Channel>[] = [
    {
      provider: contact.channelProvider.Email,
      value: ''
    }
  ]

  let exists: PersonAccount | undefined
  const query = createQuery()
  $: query.query(
    contact.class.PersonAccount,
    {
      email: email.trim()
    },
    (p) => {
      exists = p[0]
    }
  )

  const manager = createFocusManager()

  function changeEmail () {
    const index = channels.findIndex((p) => p.provider === contact.channelProvider.Email)
    if (index !== -1) {
      channels[index].value = email.trim()
    } else {
      channels.push({
        provider: contact.channelProvider.Email,
        value: email.trim()
      })
    }
    channels = channels
  }
</script>

<FocusHandler {manager} />

<Card
  label={contact.string.CreateEmployee}
  okAction={createPerson}
  canSave={firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 0 &&
    exists === undefined &&
    canSave}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="error">
    {#if exists !== undefined}
      <div class="flex-row-center error-color">
        <IconInfo size={'small'} />
        <span class="text-sm overflow-label ml-2">
          <Label label={contact.string.PersonAlreadyExists} />
        </span>
      </div>
    {/if}
  </svelte:fragment>
  <div class="flex-row-center">
    <div class="flex-grow flex-col">
      <EditBox
        placeholder={contact.string.PersonFirstNamePlaceholder}
        bind:value={firstName}
        kind={'large-style'}
        autoFocus
        focusIndex={1}
      />
      <EditBox
        placeholder={contact.string.PersonLastNamePlaceholder}
        bind:value={lastName}
        kind={'large-style'}
        focusIndex={2}
      />
      <div class="mt-1">
        <EditBox
          placeholder={contact.string.Email}
          bind:value={email}
          kind={'small-style'}
          focusIndex={3}
          on:blur={changeEmail}
        />
      </div>
      <slot name="extraControls" />
    </div>
    <div class="ml-4">
      <EditableAvatar
        avatar={object.avatar}
        name={combineName(firstName, lastName)}
        {email}
        size={'large'}
        bind:this={avatarEditor}
      />
    </div>
  </div>
  <svelte:fragment slot="pool">
    <ChannelsDropdown
      bind:value={channels}
      focusIndex={10}
      kind={'regular'}
      size={'large'}
      editable
      restricted={[contact.channelProvider.Email]}
    />
  </svelte:fragment>
</Card>
