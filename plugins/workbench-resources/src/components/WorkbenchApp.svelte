<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import { upgradeDownloadProgress } from '@hcengineering/presentation'
  import {
    Button,
    Component,
    Label,
    Loading,
    Notifications,
    deviceOptionsStore,
    fetchMetadataLocalStorage,
    location,
    setMetadataLocalStorage
  } from '@hcengineering/ui'
  import { connect, disconnect, versionError } from '../connect'

  import workbench, { workbenchId } from '@hcengineering/workbench'
  import { onDestroy } from 'svelte'
  import workbenchRes from '../plugin'
  import { workspaceCreating } from '../utils'

  const isNeedUpgrade = window.location.host === ''

  let mobileAllowed = fetchMetadataLocalStorage(workbenchRes.metadata.MobileAllowed)

  function allowMobile () {
    setMetadataLocalStorage(workbenchRes.metadata.MobileAllowed, true)
    mobileAllowed = true
  }

  onDestroy(disconnect)
</script>

{#if $location.path[0] === workbenchId || $location.path[0] === workbenchRes.component.WorkbenchApp}
  {#if $deviceOptionsStore.isMobile && mobileAllowed !== true}
    <div class="version-wrapper">
      <div class="antiPopup version-popup">
        <h1><Label label={workbenchRes.string.MobileNotSupported} /></h1>
        <Button label={workbenchRes.string.LogInAnyway} on:click={allowMobile} />
      </div>
    </div>
  {:else}
    {#key $location.path[1]}
      {#await connect(getMetadata(workbenchRes.metadata.PlatformTitle) ?? 'Platform')}
        <Loading>
          {#if ($workspaceCreating ?? -1) >= 0}
            <div class="ml-1">
              <Label label={workbenchRes.string.WorkspaceCreating} />
              {$workspaceCreating} %
            </div>
          {/if}
          {#if $versionError}
            <div class="ml-2">
              {$versionError}
            </div>
          {/if}
          {#if $upgradeDownloadProgress >= 0}
            <div class="ml-1" class:ml-2={$versionError === undefined}>
              <Label label={workbench.string.UpgradeDownloadProgress} params={{ percent: $upgradeDownloadProgress }} />
            </div>
          {/if}
        </Loading>
      {:then client}
        {#if $versionError}
          <div class="version-wrapper">
            <div class="antiPopup version-popup">
              {#if isNeedUpgrade}
                <h1><Label label={workbenchRes.string.NewVersionAvailable} /></h1>
                <span class="please-update"><Label label={workbenchRes.string.PleaseUpdate} /></span>
              {:else}
                <h1><Label label={workbenchRes.string.ServerUnderMaintenance} /></h1>
              {/if}
              {$versionError}
              {#if $upgradeDownloadProgress >= 0}
                <div class="mt-1">
                  <Label
                    label={workbench.string.UpgradeDownloadProgress}
                    params={{ percent: $upgradeDownloadProgress }}
                  />
                </div>
              {/if}
            </div>
          </div>
        {:else if client}
          <Notifications>
            <Component is={workbenchRes.component.Workbench} />
          </Notifications>
        {/if}
      {:catch error}
        <div>{error} -- {error.stack}</div>
      {/await}
    {/key}
  {/if}
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
