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
  import { getMetadata } from '@hcengineering/platform'
  import { Label, Loading, Notifications, location } from '@hcengineering/ui'
  import { upgradeDownloadProgress } from '@hcengineering/presentation'
  import { connect, versionError, invalidError } from '../connect'

  import { guestId } from '@hcengineering/guest'
  import workbench from '@hcengineering/workbench'
  import Guest from './Guest.svelte'
  import plugin from '../plugin'
</script>

{#if $location.path[0] === guestId}
  {#await connect(getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform')}
    <Loading />
  {:then client}
    {#if $invalidError}
      {invalidError}
      <div class="version-wrapper">
        <h1><Label label={plugin.string.LinkWasRevoked} /></h1>
      </div>
    {:else if $versionError}
      <div class="version-wrapper">
        <div class="antiPopup version-popup">
          <h1><Label label={workbench.string.ServerUnderMaintenance} /></h1>
          {$versionError}
          {#if $upgradeDownloadProgress >= 0}
            <div class="mt-1">
              <Label label={workbench.string.UpgradeDownloadProgress} params={{ percent: $upgradeDownloadProgress }} />
            </div>
          {/if}
        </div>
      </div>
    {:else if client}
      <Notifications>
        <Guest />
      </Notifications>
    {/if}
  {:catch error}
    <div>{error} -- {error.stack}</div>
  {/await}
{/if}

<style lang="scss">
  .version-wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .please-update {
    margin-bottom: 1rem;
  }
  .version-popup {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
    flex-grow: 1;
  }
</style>
