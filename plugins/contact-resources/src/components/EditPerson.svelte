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
  import { createEventDispatcher, onMount, afterUpdate } from 'svelte'
  import { getCurrentAccount, Ref, Space } from '@anticrm/core'
  import { CircleButton, EditBox, showPopup, IconEdit, IconAdd, Label, IconActivity } from '@anticrm/ui'
  import { getClient, createQuery, Channels, Avatar } from '@anticrm/presentation'
  import setting from '@anticrm/setting'
  import { IntegrationType } from '@anticrm/setting'
  import contact from '../plugin'
  import { combineName, getFirstName, getLastName, Person } from '@anticrm/contact'

  export let object: Person

  let firstName = getFirstName(object.name)
  let lastName = getLastName(object.name)

  const client = getClient()

  const dispatch = createEventDispatcher()

  function saveChannels (result: any) {
    if (result !== undefined) {
      object.channels = result
      client.updateDoc(object._class, object.space, object._id, { channels: result })
    }
  }

  function firstNameChange () {
    client.updateDoc(object._class, object.space, object._id, {
      name: combineName(firstName, getLastName(object.name))
    })
  }

  function lastNameChange () {
    client.updateDoc(object._class, object.space, object._id, {
      name: combineName(getFirstName(object.name), lastName)
    })
  }

  const accountId = getCurrentAccount()._id
  let integrations: Set<Ref<IntegrationType>> = new Set<Ref<IntegrationType>>()
  const settingsQuery = createQuery()
  $: settingsQuery.query(setting.class.Integration, { space: accountId as string as Ref<Space> }, (res) => {
    integrations = new Set(res.map((p) => p.type))
  })

  const sendOpen = () => dispatch('open', { ignoreKeys: ['comments', 'name', 'channels'] })
  onMount(sendOpen)
  afterUpdate(sendOpen)
</script>

{#if object !== undefined}
  <div class="flex-row-streach flex-grow">
    <div class="mr-8">
      <Avatar avatar={object.avatar} size={'x-large'} />
    </div>
    <div class="flex-grow flex-col">
      <div class="flex-grow flex-col">
        <div class="name">
          <EditBox placeholder="John" maxWidth="20rem" bind:value={firstName} on:change={firstNameChange} />
        </div>
        <div class="name">
          <EditBox placeholder="Appleseed" maxWidth="20rem" bind:value={lastName} on:change={lastNameChange} />
        </div>
      </div>

      <div class="separator" />

      <div class="flex-between channels">
        <div class="flex-row-center">
          {#if !object.channels || object.channels.length === 0}
            <CircleButton
              icon={IconAdd}
              size={'small'}
              selected
              on:click={(ev) =>
                showPopup(contact.component.SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => {
                  saveChannels(result)
                })}
            />
            <span><Label label={contact.string.AddSocialLinks} /></span>
          {:else}
            <Channels value={object.channels} size={'small'} {integrations} on:click />
            <div class="ml-1">
              <CircleButton
                icon={IconEdit}
                size={'small'}
                selected
                on:click={(ev) =>
                  showPopup(contact.component.SocialEditor, { values: object.channels ?? [] }, ev.target, (result) => {
                    saveChannels(result)
                  })}
              />
            </div>
          {/if}
        </div>

        <div class="flex-row-center">
          <a href={'#'} class="flex-row-center" on:click>
            <CircleButton icon={IconActivity} size={'small'} primary on:click />
            <span class="ml-2 small-text">View activity</span>
          </a>
        </div>
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--theme-caption-color);
  }
  .channels {
    margin-top: 0.75rem;
    span {
      margin-left: 0.5rem;
    }
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--theme-card-divider);
  }
</style>
