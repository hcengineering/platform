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

  import presentation, { getClient, Card, Channels } from '@anticrm/presentation'

  import { EditBox, showPopup, CircleButton, IconEdit, IconAdd, Label } from '@anticrm/ui'
  import SocialEditor from './SocialEditor.svelte'

  import { Organization } from '@anticrm/contact'
  import contact from '../plugin'
  import Company from './icons/Company.svelte'

  export function canClose (): boolean {
    return object.name === ''
  }

  const object: Organization = {
    name: ''
  } as Organization

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function createOrganization () {
    await client.createDoc(contact.class.Organization, contact.space.Contacts, object)

    dispatch('close')
  }
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
      <div class="fs-title"><EditBox placeholder="Apple" maxWidth="11rem" bind:value={object.name} /></div>
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
      <span><Label label={presentation.string.AddSocialLinks} /></span>
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
  .logo {
    width: 5rem;
    height: 5rem;
    color: var(--primary-button-color);
    background-color: var(--primary-button-enabled);
    border-radius: 50%;
  }
  .channels {
    margin-top: 1.25rem;
    span {
      margin-left: 0.5rem;
    }
  }
</style>
