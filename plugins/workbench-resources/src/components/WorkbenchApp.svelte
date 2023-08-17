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
  import { Component, Label, Loading, Notifications, location } from '@hcengineering/ui'
  import { connect, versionError } from '../connect'

  import { workbenchId } from '@hcengineering/workbench'
  import workbench from '../plugin'

  const isNeedUpgrade = window.location.host === ''
</script>

{#if $location.path[0] === workbenchId || $location.path[0] === workbench.component.WorkbenchApp}
  {#key $location.path[1]}
    {#await connect(getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform')}
      <Loading />
    {:then client}
      {#if !client && versionError}
        <div class="version-wrapper">
          <div class="antiPopup version-popup">
            {#if isNeedUpgrade}
              <h1><Label label={workbench.string.NewVersionAvailable} /></h1>
              <span class="please-update"><Label label={workbench.string.PleaseUpdate} /></span>
            {:else}
              <h1><Label label={workbench.string.ServerUnderMaintenance} /></h1>
            {/if}
            {versionError}
          </div>
        </div>
      {:else if client}
        <Notifications>
          <Component is={workbench.component.Workbench} />
        </Notifications>
      {/if}
    {:catch error}
      <div>{error} -- {error.stack}</div>
    {/await}
  {/key}
{/if}

<style lang="scss">
  .version-wrapper {
    height: 100%;
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
  }
</style>
