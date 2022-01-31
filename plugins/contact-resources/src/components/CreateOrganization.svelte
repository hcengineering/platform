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

  import { getClient, Card } from '@anticrm/presentation'

  import { EditBox } from '@anticrm/ui'

  import { Channel, Organization } from '@anticrm/contact'
  import contact from '../plugin'
  import Company from './icons/Company.svelte'
  import { generateId } from '@anticrm/core'
  import Channels from './Channels.svelte'

  export function canClose (): boolean {
    return object.name === ''
  }

  const id = generateId()

  const object: Organization = {
    name: ''
  } as Organization

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createOrganization () {
    await client.createDoc(contact.class.Organization, contact.space.Contacts, object, id)
    for (const channel of channels) {
      await client.addCollection(contact.class.Channel, contact.space.Contacts, id, contact.class.Organization, 'channels', {
        value: channel.value,
        provider: channel.provider
      })
    }

    dispatch('close')
  }

  let channels: Channel[] = []
</script>

<Card
  label={contact.string.CreateOrganization}
  okAction={createOrganization}
  canSave={object.name.length > 0}
  space={contact.space.Contacts}
  on:close={() => {
    dispatch('close')
  }}
>
  <div class="flex-row-center">
    <div class="mr-4 flex-center logo">
      <Company size={'large'} />
    </div>
    <div class="flex-col">
      <div class="fs-title">
        <EditBox placeholder={contact.string.OrganizationNamePlaceholder} maxWidth="11rem" bind:value={object.name} />
      </div>
    </div>
  </div>

  <div class="flex-row-center channels">
    <Channels bind:channels={channels} on:change={(e) => { channels = e.detail }} />
  </div>
</Card>

<style lang="scss">
  .logo {
    width: 5rem;
    height: 5rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-enabled);
    border-radius: 50%;
  }
  .channels {
    margin-top: 1.25rem;
  }
</style>
