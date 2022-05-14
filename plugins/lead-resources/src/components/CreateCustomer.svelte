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
  import { Channel, combineName, Contact, findPerson } from '@anticrm/contact'
  import { ChannelsDropdown } from '@anticrm/contact-resources'
  import PersonPresenter from '@anticrm/contact-resources/src/components/PersonPresenter.svelte'
  import contact from '@anticrm/contact-resources/src/plugin'
  import { AttachedData, Class, Data, Doc, generateId, MixinData, Ref } from '@anticrm/core'
  import type { Customer } from '@anticrm/lead'
  import { getResource } from '@anticrm/platform'
  import { Card, EditableAvatar, getClient } from '@anticrm/presentation'
  import {
    Button,
    EditBox,
    eventToHTMLElement,
    IconInfo,
    Label,
    SelectPopup,
    showPopup,
    createFocusManager,
    FocusHandler
  } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import lead from '../plugin'

  let firstName = ''
  let lastName = ''
  let createMore: boolean = false

  export function canClose (): boolean {
    return firstName === '' && lastName === ''
  }

  let object: Customer = {
    _class: contact.class.Person
  } as Customer

  const dispatch = createEventDispatcher()
  const client = getClient()
  let customerId = generateId()

  let channels: AttachedData<Channel>[] = []
  let avatar: File | undefined

  function formatName (targetClass: Ref<Class<Doc>>, firstName: string, lastName: string, objectName: string): string {
    return targetClass === contact.class.Person ? combineName(firstName, lastName) : objectName
  }

  async function createCustomer () {
    const candidate: Data<Contact> = {
      name: formatName(targetClass._id, firstName, lastName, object.name),
      city: object.city
    }
    if (avatar !== undefined) {
      const uploadFile = await getResource(attachment.helper.UploadFile)
      candidate.avatar = await uploadFile(avatar)
    }
    const candidateData: MixinData<Contact, Customer> = {
      description: object.description
    }

    const id = await client.createDoc(targetClass._id, contact.space.Contacts, candidate, customerId)
    await client.createMixin(
      id as Ref<Contact>,
      targetClass._id,
      contact.space.Contacts,
      lead.mixin.Customer,
      candidateData
    )

    for (const channel of channels) {
      await client.addCollection(
        contact.class.Channel,
        contact.space.Contacts,
        customerId,
        targetClass._id,
        'channels',
        {
          value: channel.value,
          provider: channel.provider
        }
      )
    }

    if (createMore) {
      // Prepare for next
      object = {
        _class: targetClass._id
      } as Customer
      customerId = generateId()
      avatar = undefined
      firstName = ''
      lastName = ''
      channels = []
    }
  }

  function onAvatarDone (e: any) {
    const { file } = e.detail

    avatar = file
  }

  let matches: Contact[] = []
  $: findPerson(
    client,
    { ...object, name: formatName(targetClass._id, firstName, lastName, object.name) },
    channels
  ).then((p) => {
    matches = p
  })

  function removeAvatar (): void {
    avatar = undefined
  }
  const targets = [
    client.getModel().getObject(contact.class.Person),
    client.getModel().getObject(contact.class.Organization)
  ]
  let targetClass = targets[0]

  function selectTarget (evt: MouseEvent): void {
    showPopup(
      SelectPopup,
      {
        value: targets.map((it) => ({ id: it._id, label: it.label, icon: it.icon })),
        placeholder: contact.string.Contacts,
        searchable: false
      },
      eventToHTMLElement(evt),
      (ref) => {
        if (ref != null) {
          const newT = targets.find((it) => it._id === ref)
          if (newT !== undefined) {
            if (targetClass._id !== newT._id) {
              targetClass = newT
              object.name = ''
              firstName = ''
              lastName = ''
              customerId = generateId()
              avatar = undefined
            }
          }
        }
      }
    )
  }
  $: canSave = formatName(targetClass._id, firstName, lastName, object.name).length > 0

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

<Card
  label={lead.string.CreateCustomer}
  okAction={createCustomer}
  {canSave}
  space={contact.space.Contacts}
  on:close={() => {
    dispatch('close')
  }}
  bind:createMore
>
  <svelte:fragment slot="space">
    <Button
      icon={targetClass.icon}
      label={targetClass.label}
      size={'small'}
      kind={'no-border'}
      on:click={selectTarget}
      focusIndex={100}
    />
  </svelte:fragment>
  {#if targetClass._id === contact.class.Person}
    <div class="flex-between flex-row-top mt-2 mb-2">
      <div class="flex-col flex-grow">
        <EditBox
          placeholder={contact.string.PersonFirstNamePlaceholder}
          bind:value={firstName}
          kind={'large-style'}
          maxWidth={'32rem'}
          focus
          focusIndex={1}
        />
        <EditBox
          placeholder={contact.string.PersonLastNamePlaceholder}
          bind:value={lastName}
          kind={'large-style'}
          maxWidth={'32rem'}
          focusIndex={2}
        />
        <div class="mt-1">
          <EditBox
            placeholder={contact.string.PersonLocationPlaceholder}
            bind:value={object.city}
            kind={'small-style'}
            maxWidth={'32rem'}
            focusIndex={3}
          />
        </div>
        <EditBox
          placeholder={lead.string.IssueDescriptionPlaceholder}
          bind:value={object.description}
          kind={'small-style'}
          maxWidth={'32rem'}
          focusIndex={4}
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
  {:else}
    <div class="flex-row-center clear-mins mt-2 mb-2">
      <div class="mr-3">
        <Button icon={contact.icon.Company} size={'medium'} kind={'link-bordered'} disabled />
      </div>
      <EditBox
        placeholder={contact.string.OrganizationNamePlaceholder}
        bind:value={object.name}
        maxWidth={'37.5rem'}
        kind={'large-style'}
        focus
        focusIndex={1}
      />
    </div>
  {/if}
  <svelte:fragment slot="pool">
    <ChannelsDropdown bind:value={channels} focusIndex={10} editable />
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
