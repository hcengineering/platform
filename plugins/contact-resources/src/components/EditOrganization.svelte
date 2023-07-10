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
  import { Organization } from '@hcengineering/contact'
  import { getCurrentAccount, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import setting, { IntegrationType } from '@hcengineering/setting'
  import { createFocusManager, EditBox, FocusHandler, Scroller } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import contact from '../plugin'
  import ChannelsEditor from './ChannelsEditor.svelte'
  import Company from './icons/Company.svelte'

  export let object: Organization

  const client = getClient()

  const dispatch = createEventDispatcher()

  function nameChange () {
    client.updateDoc(object._class, object.space, object._id, { name: object.name })
  }

  const accountId = getCurrentAccount()._id
  let integrations: Set<Ref<IntegrationType>> = new Set<Ref<IntegrationType>>()
  const settingsQuery = createQuery()
  $: settingsQuery.query(setting.class.Integration, { createdBy: accountId, disabled: false }, (res) => {
    integrations = new Set(res.map((p) => p.type))
  })

  onMount(() => {
    dispatch('open', { ignoreKeys: ['comments', 'name', 'channels'] })
  })

  const manager = createFocusManager()
</script>

<FocusHandler {manager} />

{#if object !== undefined}
  <div class="flex-row-center">
    <div class="mr-8 flex-center flex-no-shrink logo">
      <Company size={'large'} />
    </div>
    <div class="flex-grow flex-col">
      <div class="name">
        <EditBox
          placeholder={contact.string.PersonFirstNamePlaceholder}
          bind:value={object.name}
          on:change={nameChange}
          focusIndex={1}
        />
      </div>
      <div class="separator" />
      <Scroller contentDirection={'horizontal'} padding={'.125rem .125rem .5rem'} stickedScrollBars thinScrollBars>
        <ChannelsEditor attachedTo={object._id} attachedClass={object._class} {integrations} focusIndex={10} on:click />
      </Scroller>
    </div>
  </div>
{/if}

<style lang="scss">
  .logo {
    width: 5rem;
    height: 5rem;
    color: var(--accented-button-color);
    background-color: var(--accented-button-default);
    border-radius: 50%;
  }
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
