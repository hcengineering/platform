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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { createFocusManager, EditBox, FocusHandler } from '@hcengineering/ui'

  import { ChannelsEditor, EditableAvatar } from '@hcengineering/contact-resources'
  import core, { getCurrentAccount, Ref } from '@hcengineering/core'
  import { Department } from '@hcengineering/hr'
  import setting, { IntegrationType } from '@hcengineering/setting'
  import { createEventDispatcher, onMount } from 'svelte'
  import hr from '../plugin'

  export let object: Department

  let avatarEditor: EditableAvatar

  const dispatch = createEventDispatcher()
  const client = getClient()

  async function onAvatarDone () {
    if (object === undefined) return

    if (object.avatar != null) {
      await avatarEditor.removeAvatar(object.avatar)
    }
    const avatar = await avatarEditor.createAvatar()
    await client.updateDoc(object._class, object.space, object._id, {
      avatar
    })
  }

  async function nameChange (): Promise<void> {
    if (object === undefined) return
    await client.update(object, {
      name: object.name
    })
  }

  const manager = createFocusManager()

  let integrations: Set<Ref<IntegrationType>> = new Set<Ref<IntegrationType>>()
  const accountId = getCurrentAccount()._id
  const settingsQuery = createQuery()
  $: settingsQuery.query(setting.class.Integration, { createdBy: accountId, disabled: false }, (res) => {
    integrations = new Set(res.map((p) => p.type))
  })

  onMount(() => {
    dispatch('open', {
      ignoreKeys: ['comments', 'name', 'channels', 'private', 'archived'],
      collectionArrays: ['members']
    })
  })
</script>

<FocusHandler {manager} />

{#if object !== undefined}
  <div class="flex-row-stretch flex-grow">
    <div class="mr-8">
      {#key object}
        <EditableAvatar
          avatar={object.avatar}
          size={'x-large'}
          icon={hr.icon.Department}
          bind:this={avatarEditor}
          on:done={onAvatarDone}
        />
      {/key}
    </div>
    <div class="flex-grow flex-col">
      <div class="name">
        <EditBox placeholder={core.string.Name} bind:value={object.name} on:change={nameChange} focusIndex={1} />
      </div>
      <div class="separator" />
      <div class="flex-row-center">
        <ChannelsEditor attachedTo={object._id} attachedClass={object._class} {integrations} focusIndex={10} on:click />
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
  .separator {
    margin: 1rem 0;
    height: 1px;
    background-color: var(--divider-color);
  }
</style>
