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
  <svg class="absolute w-0 h-0">
    <clipPath id="notify-normal">
      <path d="M0,0v52.5h52.5V0H0z M34,23.2c-3.2,0-5.8-2.6-5.8-5.8c0-3.2,2.6-5.8,5.8-5.8c3.2,0,5.8,2.6,5.8,5.8 C39.8,20.7,37.2,23.2,34,23.2z"/>
    </clipPath>
    <clipPath id="notify-small">
      <path d="M0,0v45h45V0H0z M29.5,20c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S32.3,20,29.5,20z"/>
    </clipPath>
  </svg>
  <div class="flex h-full pb-5">
    <div class="flex flex-col justify-between items-center w-20 h-full rounded-3xl" style="min-width: 5rem;">
      <ActivityStatus status="active"/>
      <Applications active={currentApp}/>
      <div class="flex items-center" style="min-height: 6.25rem;">
        <img class="w-9 h-9" src={avatar} alt="Profile"/>
      </div>
    </div>
    {#if navigator}
    <div class="flex flex-col mr-4 w-72 h-full rounded-3xl background-theme-bg-color" style="min-width: 18rem;">
      <NavHeader label={'Chat'}/>
      <Navigator model={navigatorModel}/>
    </div>
    {/if}
    <div class="flex flex-col flex-grow mr-4 h-full rounded-3xl  background-theme-bg-color">
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
