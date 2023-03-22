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
  import { combineName, EmployeeAccount, getFirstName, getLastName, Person } from '@hcengineering/contact'
  import { getCurrentAccount, Ref, Space } from '@hcengineering/core'
  import { AttributeEditor, createQuery, getClient } from '@hcengineering/presentation'
  import setting, { IntegrationType } from '@hcengineering/setting'
  import { createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import contact from '../plugin'
  import ChannelsEditor from './ChannelsEditor.svelte'
  import EditableAvatar from './EditableAvatar.svelte'

  export let object: Person
  const client = getClient()

  const account = getCurrentAccount() as EmployeeAccount

  let avatarEditor: EditableAvatar

  let firstName = getFirstName(object.name)
  let lastName = getLastName(object.name)

  $: setName(object)

  function setName (object: Person) {
    firstName = getFirstName(object.name)
    lastName = getLastName(object.name)
  }

  const dispatch = createEventDispatcher()

  function firstNameChange () {
    client.update(object, {
      name: combineName(firstName, getLastName(object.name))
    })
  }

  function lastNameChange () {
    client.update(object, {
      name: combineName(getFirstName(object.name), lastName)
    })
  }

  let integrations: Set<Ref<IntegrationType>> = new Set<Ref<IntegrationType>>()
  const settingsQuery = createQuery()
  $: settingsQuery.query(
    setting.class.Integration,
    { space: account._id as string as Ref<Space>, disabled: false },
    (res) => {
      integrations = new Set(res.map((p) => p.type))
    }
  )

  const sendOpen = () => dispatch('open', { ignoreKeys: ['comments', 'name', 'channels', 'city'] })
  onMount(sendOpen)

  async function onAvatarDone () {
    if (object.avatar != null) {
      await avatarEditor.removeAvatar(object.avatar)
    }
    const avatar = await avatarEditor.createAvatar()
    await client.update(object, {
      avatar
    })
  }

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

{#if object !== undefined}
  <div class="flex-row-stretch flex-grow">
    <div class="mr-8">
      {#key object}
        <EditableAvatar
          avatar={object.avatar}
          id={object._id}
          size={'x-large'}
          bind:this={avatarEditor}
          on:done={onAvatarDone}
        />
      {/key}
    </div>
    <div class="flex-grow flex-col">
      <div class="flex-grow flex-col">
        <div class="name">
          <EditBox
            placeholder={contact.string.PersonFirstNamePlaceholder}
            bind:value={firstName}
            on:change={firstNameChange}
            focusIndex={1}
          />
        </div>
        <div class="name">
          <EditBox
            placeholder={contact.string.PersonLastNamePlaceholder}
            bind:value={lastName}
            on:change={lastNameChange}
            focusIndex={2}
          />
        </div>
        <div class="location">
          <AttributeEditor maxWidth="20rem" _class={contact.class.Person} {object} key="city" focusIndex={3} />
        </div>
      </div>

      <div class="separator" />
      <div class="flex-row-center">
        <ChannelsEditor
          attachedTo={object._id}
          attachedClass={object._class}
          bind:integrations
          shape={'circle'}
          focusIndex={10}
        />
      </div>
    </div>
  </div>
{/if}

<style lang="scss">
  .name {
    font-weight: 500;
    font-size: 1.25rem;
    color: var(--caption-color);
  }
  .location {
    margin-top: 0.25rem;
    font-size: 0.75rem;
  }

  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--divider-color);
  }
</style>
