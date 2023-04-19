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
  import { Component, Loading, Notifications, location } from '@hcengineering/ui'
  import { connect, versionError } from '../connect'

  import { workbenchId } from '@hcengineering/workbench'
  import workbench from '../plugin'
</script>

{#if $location.path[0] === workbenchId || $location.path[0] === workbench.component.WorkbenchApp}
  {#key $location.path[1]}
    {#await connect(getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform')}
      <Loading />
    {:then client}
      {#if !client && versionError}
        <div class="antiPopup version-popup">
          <h1>Server is under maintenance.</h1>
          {versionError}
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
  .version-popup {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: 25%;
    right: 25%;
    top: 25%;
    bottom: 25%;
  }
</style>
