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
  import type { Ref, Space, Data } from '@anticrm/core'

  import { getClient, Card, Channels, Avatar } from '@anticrm/presentation'

  import { EditBox, showPopup, CircleButton, IconEdit, IconAdd, Label } from '@anticrm/ui'
  import SocialEditor from './SocialEditor.svelte'

  import { combineName, Person } from '@anticrm/contact'
  import contact from '../plugin'

  export let space: Ref<Space>

  let _space = space

  let firstName = ''
  let lastName = ''

  export function canClose (): boolean {
    return firstName === '' && lastName === ''
  }

  const object: Person = {} as Person

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createPerson () {
    const person: Data<Person> = {
      name: combineName(firstName, lastName),
      city: object.city,
      channels: object.channels
    }

    await client.createDoc(contact.class.Person, _space, person)

    dispatch('close')
  }
</script>

<Card
  label={contact.string.CreatePerson}
  okAction={createPerson}
  canSave={firstName.length > 0 && lastName.length > 0}
  spaceClass={contact.class.Persons}
  spaceLabel={contact.string.PersonsFolder}
  spacePlaceholder={contact.string.SelectFolder}
  bind:space={_space}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-center">
    <div class="mr-4">
      <Avatar avatar={object.avatar} size={'large'} />
    </div>
    <div class="flex-col">
      <div class="fs-title"><EditBox placeholder="John" maxWidth="10rem" bind:value={firstName} /></div>
      <div class="fs-title mb-1"><EditBox placeholder="Appleseed" maxWidth="10rem" bind:value={lastName} /></div>
      <div class="small-text"><EditBox placeholder="Location" maxWidth="10rem" bind:value={object.city} /></div>
    </div>
  </div>

  <div class="flex-row-center channels">
    {#if !object.channels || object.channels.length === 0}
      <CircleButton
        icon={IconAdd}
        size={'small'}
        transparent
        on:click={(ev) =>
          showPopup(SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => {
            object.channels = result
          })}
      />
      <span><Label label={contact.string.AddSocialLinks} /></span>
    {:else}
      <Channels value={object.channels} size={'small'} />
      <div class="ml-1">
        <CircleButton
          icon={IconEdit}
          size={'small'}
          transparent
          on:click={(ev) =>
            showPopup(SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => {
              object.channels = result
            })}
        />
      </div>
    {/if}
  </div>
</Card>

<style lang="scss">
  .channels {
    margin-top: 1.25rem;
    span {
      margin-left: 0.5rem;
    }
  }
</style>
