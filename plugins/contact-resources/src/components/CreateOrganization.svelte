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
  import { Channel, Organization } from '@anticrm/contact'
  import { AttachedData, generateId } from '@anticrm/core'
  import { Card, getClient } from '@anticrm/presentation'
  import { Button, EditBox, eventToHTMLElement, showPopup } from '@anticrm/ui'
  import { createEventDispatcher } from 'svelte'
  import contact from '../plugin'
  import ChannelsView from './ChannelsView.svelte'
  import Company from './icons/Company.svelte'

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

  let channels: AttachedData<Channel>[] = []
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
  <div class="flex-row-center clear-mins">
    <div class="mr-3">
      <Button icon={Company} size={'medium'} kind={'link-bordered'} disabled />
    </div>
    <EditBox
      placeholder={contact.string.OrganizationNamePlaceholder}
      bind:value={object.name}
      maxWidth={'37.5rem'} kind={'large-style'} focus
    />
  </div>
  {#if channels.length > 0}
    <ChannelsView value={channels} size={'small'} on:click />
  {/if}
  <svelte:fragment slot="footer">
    <Button
      icon={contact.icon.SocialEdit}
      kind={'transparent'}
      on:click={(ev) =>
        showPopup(contact.component.SocialEditor, { values: channels }, eventToHTMLElement(ev), (result) => {
          if (result !== undefined) channels = result
        })
      }
    />
  </svelte:fragment>
</Card>
