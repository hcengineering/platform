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
  import { NotificationProvider } from '@hcengineering/notification'
  import { AnySvelteComponent, Icon, Label, ModernToggle } from '@hcengineering/ui'
  import { getResource } from '@hcengineering/platform'
  import { createEventDispatcher } from 'svelte'

  import { providersSettings } from '../../utils'

  export let provider: NotificationProvider

  const dispatch = createEventDispatcher()

  let presenter: AnySvelteComponent | undefined

  $: setting = $providersSettings.find(({ attachedTo }) => attachedTo === provider._id)
  $: enabled = setting?.enabled ?? provider.defaultEnabled

  $: if (provider.presenter) {
    void getResource(provider.presenter).then((res) => {
      presenter = res
    })
  }
</script>

<div class="flex-col">
  <div class="flex-row-top flex-gap-2">
    <div class="flex-col flex-gap-2 w-120">
      <div class="flex-row-center flex-gap-2">
        <Icon icon={provider.icon} size="medium" />
        <span class="label font-semi-bold">
          <Label label={provider.label} />
        </span>
      </div>
      {#if provider.description}
        <span class="description">
          <Label label={provider.description} />
        </span>
      {/if}
    </div>
    {#if provider.canDisable}
      <ModernToggle size="small" checked={enabled} on:change={() => dispatch('toggle', provider)} />
    {/if}
  </div>
  {#if presenter}
    <svelte:component this={presenter} {provider} {setting} {enabled} />
  {/if}
</div>

<style lang="scss">
  .label {
    color: var(--global-primary-TextColor);
  }

  .description {
    color: var(--global-secondary-TextColor);
  }
</style>
