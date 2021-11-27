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
  import type { Ref, Space } from '@anticrm/core'
  import { getMetadata } from '@anticrm/platform'
  import login from '@anticrm/login'
  import { createQuery } from '@anticrm/presentation'
  import setting from '@anticrm/setting'
  import type { Integration, IntegrationType } from '@anticrm/setting'
  import PluginCard from './PluginCard.svelte'

  const accountId = getMetadata(login.metadata.LoginEmail)
  const typeQuery = createQuery()
  const integrationQuery = createQuery()

  let integrations: Integration[] = []
  let integrationTypes: IntegrationType[] = []

  typeQuery.query(setting.class.IntegrationType, {}, (res) => (integrationTypes = res))
  integrationQuery.query(setting.class.Integration, { space: accountId as Ref<Space> }, (res) => (integrations = res))
</script>

<div class="cards-container">
  {#each integrationTypes as integrationType (integrationType._id)}
    <PluginCard integration={integrations.find((p) => p.type === integrationType._id)} {integrationType} />
  {/each}
</div>

<style lang="scss">
  .cards-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, auto));
    grid-auto-rows: minmax(12.5rem, auto);
    grid-gap: 1.5rem;
    padding: 3rem;
  }
</style>
