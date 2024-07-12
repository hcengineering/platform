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
  import notification, { NotificationProvider, NotificationProviderSetting } from '@hcengineering/notification'
  import { Icon, Label, ModernToggle } from '@hcengineering/ui'
  import core, { Ref } from '@hcengineering/core'

  export let providerSettings: NotificationProviderSetting[] = []

  const client = getClient()
  const providers = client
    .getModel()
    .findAllSync(notification.class.NotificationProvider, {})
    .sort((provider1, provider2) => provider1.order - provider2.order)

  function getProviderStatus (ref: Ref<NotificationProvider>): boolean {
    const provider = providers.find(({ _id }) => _id === ref)

    if (provider === undefined) return false

    const setting = providerSettings.find(({ attachedTo }) => attachedTo === provider._id)
    return setting?.enabled ?? provider.defaultEnabled
  }

  async function updateStatus (ref: Ref<NotificationProvider>, enabled: boolean): Promise<void> {
    const setting = providerSettings.find(({ attachedTo }) => attachedTo === ref)
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

  async function onToggle (provider: NotificationProvider): Promise<void> {
    const setting = providerSettings.find(({ attachedTo }) => attachedTo === provider._id)
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

{#each providers as provider}
  {@const setting = providerSettings.find(({ attachedTo }) => attachedTo === provider._id)}

  <div class="flex-row-center flex-gap-2">
    <div class="flex-col flex-gap-1 mb-4 w-120">
      <div class="flex-row-center flex-gap-2">
        <Icon icon={provider.icon} size="medium" />
        <span class="label font-semi-bold">
          <Label label={provider.label} />
        </span>
      </div>
      <span class="description">
        <Label label={provider.description} />
      </span>
    </div>
    {#if provider.canDisable}
      <ModernToggle
        size="small"
        checked={setting?.enabled ?? provider.defaultEnabled}
        on:change={() => onToggle(provider)}
      />
    {/if}
  </div>
{/each}

<style lang="scss">
  .label {
    color: var(--global-primary-TextColor);
  }

  .description {
    color: var(--global-secondary-TextColor);
  }
</style>
