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
  import attachment from '@anticrm/attachment'
  import { Channel, combineName, findPerson, Person } from '@anticrm/contact'
  import { ChannelsDropdown } from '@anticrm/contact-resources'
  import PersonPresenter from '@anticrm/contact-resources/src/components/PersonPresenter.svelte'
  import contact from '@anticrm/contact-resources/src/plugin'
  import { AttachedData, Data, generateId, MixinData, Ref } from '@anticrm/core'
  import type { Customer } from '@anticrm/lead'
  import { getResource } from '@anticrm/platform'
  import { Card, EditableAvatar, getClient } from '@anticrm/presentation'
  import { EditBox, IconInfo, Label } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  let firstName = ''
  let lastName = ''

  export function canClose (): boolean {
    return firstName === '' && lastName === ''
  }

  const object: Customer = {
    _class: contact.class.Person
  } as Customer

  const dispatch = createEventDispatcher()
  const client = getClient()
  const customerId = generateId()

  let channels: AttachedData<Channel>[] = []
  let avatar: File | undefined

  async function createCustomer () {
    const candidate: Data<Person> = {
      name: combineName(firstName, lastName),
      city: object.city
    }
    if (avatar !== undefined) {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      candidate.avatar = await uploadFile(avatar)
    }
    const candidateData: MixinData<Person, Customer> = {
      description: object.description
    }

    const id = await client.createDoc(contact.class.Person, contact.space.Contacts, candidate, customerId)
    await client.createMixin(
      id as Ref<Person>,
      contact.class.Person,
      contact.space.Contacts,
      lead.mixin.Customer,
      candidateData
    )

    for (const channel of channels) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        customerId,
        contact.class.Person,
        'channels',
        {
          value: channel.value,
          provider: channel.provider
        }
      )
    }

    dispatch('close')
  }

  function onAvatarDone (e: any) {
    const { file } = e.detail

    avatar = file
  }

  let matches: Person[] = []
  $: findPerson(client, { ...object, name: combineName(firstName, lastName) }, channels).then((p) => {
    matches = p
  })

  function removeAvatar (): void {
    avatar = undefined
  }
</script>

<Card
  label={lead.string.CreateCustomer}
  okAction={createCustomer}
  canSave={firstName.length > 0 && lastName.length > 0 && matches.length === 0}
  space={contact.space.Contacts}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-between flex-row-top">
    <div class="flex-col flex-grow">
      <EditBox
        placeholder={contact.string.PersonFirstNamePlaceholder}
        bind:value={firstName}
        kind={'large-style'}
        maxWidth={'32rem'}
        focus
      />
      <EditBox
        placeholder={contact.string.PersonLastNamePlaceholder}
        bind:value={lastName}
        kind={'large-style'}
        maxWidth={'32rem'}
      />
      <div class="mt-1">
        <EditBox
          placeholder={contact.string.PersonLocationPlaceholder}
          bind:value={object.city}
          kind={'small-style'}
          maxWidth={'32rem'}
        />
      </div>
      <EditBox
        placeholder={lead.string.IssueDescriptionPlaceholder}
        bind:value={object.description}
        kind={'small-style'}
        maxWidth={'32rem'}
      />
    </div>
    <div class="ml-4 flex">
      <EditableAvatar
        bind:direct={avatar}
        avatar={object.avatar}
        size={'large'}
        on:remove={removeAvatar}
        on:done={onAvatarDone}
      />
    </div>
  </div>
  <svelte:fragment slot="pool">
    <ChannelsDropdown bind:value={channels} editable />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    {#if matches.length > 0}
      <div class="flex-row-center error-color">
        <IconInfo size={'small'} />
        <span class="text-sm overflow-label ml-2">
          <Label label={contact.string.PersonAlreadyExists} />
        </span>
        <div class="ml-4"><PersonPresenter value={matches[0]} /></div>
      </div>
    {/if}
  </svelte:fragment>
</Card>

<style lang="scss">
  .resume {
    padding: 0.5rem 0.75rem;
    background: var(--accent-bg-color);
    border: 1px dashed var(--divider-color);
    border-radius: 0.5rem;

    &.solid {
      border-style: solid;
    }
  }
</style>
