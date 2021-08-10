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
  import ActivityStatus from './ActivityStatus.svelte'
  import Applications from './Applications.svelte'
  import NavHeader from './NavHeader.svelte'
  import avatar from '../../img/avatar.png'

  import { onDestroy } from 'svelte'
  
  import type { Ref, Space, Client } from '@anticrm/core'
  import type { Application, NavigatorModel, ViewConfiguration } from '@anticrm/workbench'
  import { setClient } from '@anticrm/presentation'
  import workbench from '@anticrm/workbench'

  import Navigator from './Navigator.svelte'
  import Modal from './Modal.svelte'
  import SpaceHeader from './SpaceHeader.svelte'
  import SpaceView from './SpaceView.svelte'
  
  import { AnyComponent, location } from '@anticrm/ui'
  import core from '@anticrm/core'

  export let client: Client

  setClient(client)

  let currentApp: Ref<Application> | undefined
  let currentSpace: Ref<Space> | undefined
  let currentView: ViewConfiguration | undefined
  let createItemDialog: AnyComponent | undefined
  let navigatorModel: NavigatorModel | undefined

  onDestroy(location.subscribe(async (loc) => {
    currentApp = loc.path[1] as Ref<Application>
    currentSpace = loc.path[2] as Ref<Space>
    const space = (await client.findAll(core.class.Space, { _id: currentSpace }))[0]
    if (space) {
      const spaceClass = client.getHierarchy().getClass(space._class) // (await client.findAll(core.class.Class, { _id: space._class }))[0]
      const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
      currentView = view.view
      createItemDialog = currentView.createItemDialog
    } else {
      currentView = undefined
      createItemDialog = undefined
    }
    navigatorModel = (await client.findAll(workbench.class.Application, { _id: currentApp }))[0]?.navigatorModel
  }))
</script>

{#if client}
  <!-- <svg class="absolute w-0 h-0" viewBox="0 0 48 48">
    <clipPath class="w-15 h-15" id="notify">
      <path d="M0,0v48h48V0H0z M32,23c-3.9,0-7-3.1-7-7s3.1-7,7-7s7,3.1,7,7S35.9,23,32,23z"/>
    </clipPath>
  </svg> -->
  <div class="flex h-full pb-6">
    <div class="flex flex-col justify-between min-w-685 items-center h-full rounded-3xl">
      <ActivityStatus status="active"/>
      <Applications active={currentApp}/>
      <div class="flex items-center min-h-715">
        <img class="w-10 h-10" src={avatar} alt="Profile"/>
      </div>
    </div>
    {#if navigator}
    <div class="flex flex-col mr-6 w-80 min-w-80 h-full rounded-3xl background-theme-bg-color">
      <NavHeader/>
      <Navigator model={navigatorModel}/>
    </div>
    {/if}
    <div class="flex flex-col flex-grow mr-6 h-full rounded-3xl  background-theme-bg-color">
      <SpaceHeader space={currentSpace} {createItemDialog}/>
      {#if currentView && currentSpace}
        <SpaceView space={currentSpace} _class={currentView.class} options={currentView.options} />
      {/if}
    </div>
    <!-- <div class="aside"><Chat thread/></div> -->
  </div>
  <Modal />
{:else}
  No client
{/if}
