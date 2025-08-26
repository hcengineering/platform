<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import type { Integration } from '@hcengineering/account-client'
  import { BaseIntegrationState } from '@hcengineering/setting-resources'
  import { CardPresenter } from '@hcengineering/card-resources'
  import { OK } from '@hcengineering/platform'

  export let integration: Integration
</script>

<BaseIntegrationState isLoading={false} {integration} value={integration.data?.email} status={OK}>
  <svelte:fragment slot="content">
    {#if integration?.data?.channelId !== undefined}
      <CardPresenter value={integration?.data?.channelId} />
    {/if}
  </svelte:fragment>
</BaseIntegrationState>
