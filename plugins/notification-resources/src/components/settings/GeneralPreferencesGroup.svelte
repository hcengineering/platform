<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import notification, { NotificationProvider } from '@hcengineering/notification'
  import core, { Ref } from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'

  import { providersSettings } from '../../utils'
  import ProviderPreferences from './ProviderPreferences.svelte'

  const client = getClient()
  const providers = client
    .getModel()
    .findAllSync(notification.class.NotificationProvider, {})
    .sort((provider1, provider2) => provider1.order - provider2.order)

  function getProviderStatus (ref: Ref<NotificationProvider>): boolean {
    const provider = providers.find(({ _id }) => _id === ref)

    if (provider === undefined) return false

    const setting = $providersSettings.find(({ attachedTo }) => attachedTo === provider._id)
    return setting?.enabled ?? provider.defaultEnabled
  }

  async function updateStatus (ref: Ref<NotificationProvider>, enabled: boolean): Promise<void> {
    const setting = $providersSettings.find(({ attachedTo }) => attachedTo === ref)
    if (setting !== undefined) {
      await client.update(setting, { enabled })
      setting.enabled = enabled
    } else {
      await client.createDoc(notification.class.NotificationProviderSetting, core.space.Workspace, {
        attachedTo: ref,
        enabled
      })
    }
  }

  async function onToggle (event: CustomEvent): Promise<void> {
    const provider = event.detail
    if (provider == null) return

    const setting = $providersSettings.find(({ attachedTo }) => attachedTo === provider._id)
    const enabled = setting !== undefined ? !setting.enabled : !provider.defaultEnabled

    await updateStatus(provider._id, enabled)

    if (enabled && provider?.depends !== undefined) {
      const current = getProviderStatus(provider.depends)
      if (!current) {
        await updateStatus(provider.depends, true)
      }
    } else if (!enabled) {
      const dependents = providers.filter((p) => p.depends === provider._id)
      for (const dependent of dependents) {
        await updateStatus(dependent._id, false)
      }
    }
  }
</script>

<div class="flex-col flex-gap-4">
  {#each providers as provider (provider._id)}
    {#if provider.isAvailableFn}
      {#await getResource(provider.isAvailableFn) then isAvailableFn}
        {#if isAvailableFn()}
          <ProviderPreferences {provider} on:toggle={onToggle} />
        {/if}
      {/await}
    {:else}
      <ProviderPreferences {provider} on:toggle={onToggle} />
    {/if}
  {/each}
</div>
