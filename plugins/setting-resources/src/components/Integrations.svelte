<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
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
  import { Ref, getCurrentAccount } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import type { Integration, IntegrationType } from '@hcengineering/setting'
  import setting from '@hcengineering/setting'
  import { Icon, Label } from '@hcengineering/ui'
  import PluginCard from './PluginCard.svelte'

  const accountId = getCurrentAccount()._id
  const typeQuery = createQuery()
  const integrationQuery = createQuery()

  let integrations: Integration[] = []
  let integrationTypes: IntegrationType[] = []

  typeQuery.query(setting.class.IntegrationType, {}, (res) => (integrationTypes = res))
  integrationQuery.query(
    setting.class.Integration,
    { createdBy: accountId },
    (res) => (integrations = res.filter((p) => p.value !== ''))
  )

  function getIntegrations (type: Ref<IntegrationType>, integrations: Integration[]): Integration[] {
    return integrations.filter((p) => p.type === type)
  }
</script>

<div class="antiComponent">
  <div class="ac-header short divide">
    <div class="ac-header__icon"><Icon icon={setting.icon.Integrations} size={'medium'} /></div>
    <div class="ac-header__title"><Label label={setting.string.Integrations} /></div>
  </div>
  <div class="ac-body__cards-container">
    {#each integrationTypes as integrationType (integrationType._id)}
      {#if integrationType.allowMultiple}
        {#each getIntegrations(integrationType._id, integrations) as integration (integration._id)}
          <PluginCard {integration} {integrationType} />
        {/each}
        <PluginCard integration={undefined} {integrationType} />
      {:else}
        <PluginCard integration={integrations.find((p) => p.type === integrationType._id)} {integrationType} />
      {/if}
    {/each}
  </div>
</div>
