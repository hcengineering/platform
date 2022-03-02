<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { AttachedData, Data, FindResult, generateId } from '@anticrm/core'
  import { getResource } from '@anticrm/platform'

  import { getClient, Card, EditableAvatar } from '@anticrm/presentation'

  import attachment from '@anticrm/attachment'
  import { EditBox, IconInfo, Label } from '@anticrm/ui'

  import { Channel, combineName, findPerson, Person } from '@anticrm/contact'
  import contact from '../plugin'
  import Channels from './Channels.svelte'
  import PersonPresenter from './PersonPresenter.svelte'

  let firstName = ''
  let lastName = ''

  const id = generateId()

  export function canClose (): boolean {
    return firstName === '' && lastName === ''
  }

  const object: Person = {} as Person

  const dispatch = createEventDispatcher()
  const client = getClient()

  let avatar: File | undefined

  function onAvatarDone (e: any) {
    const { file } = e.detail

    avatar = file
  }

  async function createPerson () {
    const uploadFile = await getResource(attachment.helper.UploadFile)
    const avatarProp = avatar !== undefined ? { avatar: await uploadFile(avatar) } : {}

    const person: Data<Person> = {
      name: combineName(firstName, lastName),
      city: object.city,
      ...avatarProp
    }

    await client.createDoc(contact.class.Person, contact.space.Contacts, person, id)

    for (const channel of channels) {
      await client.addCollection(contact.class.Channel, contact.space.Contacts, id, contact.class.Person, 'channels', {
        value: channel.value,
        provider: channel.provider
      })
    }
    dispatch('close')
  }

  let channels: AttachedData<Channel>[] = []

  let matches: FindResult<Person> = []
  $: findPerson(client, { ...object, name: combineName(firstName, lastName) }, channels).then((p) => {
    matches = p
  })
</script>

<Card
  label={contact.string.CreatePerson}
  okAction={createPerson}
  canSave={firstName.length > 0 && lastName.length > 0 && matches.length === 0}
  bind:space={contact.space.Contacts}
  on:close={() => {
    dispatch('close')
  }}
>
  {#if matches.length > 0}
    <div class="flex-row update-container ERROR">
      <div class="flex mb-2">
        <IconInfo size={'small'} />
        <div class="text-sm ml-2 overflow-label">
          <Label label={contact.string.PersonAlreadyExists} />
        </div>
      </div>
      <PersonPresenter value={matches[0]} />
    </div>
  {/if}
  <div class="flex-row-center">
    <div class="mr-4">
      <EditableAvatar avatar={object.avatar} size={'large'} on:done={onAvatarDone} />
    </div>
    <div class="flex-col">
      <div class="fs-title">
        <EditBox placeholder={contact.string.PersonFirstNamePlaceholder} maxWidth="12rem" bind:value={firstName} />
      </div>
      <div class="fs-title mb-1">
        <EditBox placeholder={contact.string.PersonLastNamePlaceholder} maxWidth="12rem" bind:value={lastName} />
      </div>
      <div class="text-sm">
        <EditBox placeholder={contact.string.PersonLocationPlaceholder} maxWidth="12rem" bind:value={object.city} />
      </div>
    </div>
  </div>

  <div class="flex-row-center mt-5">
    <Channels
      bind:channels
      on:change={(e) => {
        channels = e.detail
      }}
    />
  </div>
</Card>

<style lang="scss">
  .update-container {
    margin-left: -1rem;
    margin-right: -1rem;
    padding: 1rem;
    margin-bottom: 1rem;
    user-select: none;
    font-size: 14px;

    color: var(--theme-content-color);
    &.ERROR { color: var(--system-error-color); }

    border: 1px dashed var(--theme-zone-border);
    border-radius: 0.5rem;
    backdrop-filter: blur(10px);
  }
</style>
