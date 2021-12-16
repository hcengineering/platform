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
  import { getCurrentAccount, Ref, Space } from '@anticrm/core';
  import { createQuery } from '@anticrm/presentation'
  import setting from '@anticrm/setting'
  import type { Integration, IntegrationType } from '@anticrm/setting'
  import PluginCard from './PluginCard.svelte'
  import { Icon, Label } from '@anticrm/ui'

  // const accountId = getCurrentAccount()._id
  // const typeQuery = createQuery()
  // const integrationQuery = createQuery()

  // let integrations: Integration[] = []
  // let integrationTypes: IntegrationType[] = []

  // typeQuery.query(setting.class.IntegrationType, {}, (res) => (integrationTypes = res))
  // integrationQuery.query(setting.class.Integration, { space: accountId as string as Ref<Space> }, (res) => (integrations = res))
</script>

<div class="flex-col h-full">
  <div class="flex-row-center header">
    <div class="content-color mr-3"><Icon icon={setting.icon.Support} size={'medium'} /></div>
    <div class="fs-title"><Label label={setting.string.Support}/></div>
  </div>
</div>

<style lang="scss">
  .header {
    padding: 0 1.75rem 0 2.5rem;
    height: 4rem;
    min-height: 4rem;
    border-bottom: 1px solid var(--theme-menu-divider);
  }
</style>
