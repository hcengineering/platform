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
  import { getCurrentLocation, Label, navigate } from '@anticrm/ui'
  import { Avatar, getClient } from '@anticrm/presentation'
  import workbench, { Application, SpecialNavModel } from '@anticrm/workbench'
  import setting from '@anticrm/setting'
  import { Ref } from '@anticrm/core'

  const client = getClient()
  async function getItems(): Promise<SpecialNavModel[] | undefined> {
    const app = await client.findOne(workbench.class.Application, { _id: setting.ids.SettingApp as Ref<Application> })
    return app?.navigatorModel?.specials
  }

  function selectSpecial (sp: SpecialNavModel): void {
    const loc = getCurrentLocation()
    loc.path[1] = setting.ids.SettingApp
    loc.path[2] = sp.id
    loc.path.length = 3
    navigate(loc)
  }
</script>

<div class="account-popup">
  <div class="popup-bg" />
  <div class="flex-row-center header">
    <Avatar size={'medium'} />
    <div class="ml-2 flex-col">
      <div class="overflow-label fs-bold caption-color">User Name</div>
      <div class="overflow-label small-text content-dark-color">rosamund.chen@gmail.com</div>
    </div>
  </div>
  <div class="content">
    {#await getItems() then items}
      {#if items}
        {#each items as item }
          <div class="item" on:click={() => selectSpecial(item)}><Label label={item.label} /></div>
        {/each}
      {/if}
    {/await}
    <div class="item"><Label label={'Sign out'} /></div>
  </div>
</div>

<style lang="scss">
  .account-popup {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 16rem;
    min-width: 16rem;
    max-width: 16rem;
    border-radius: 1.25rem;

    .header {
      flex-shrink: 0;
      margin: .75rem 1rem;
    }

    .content {
      flex-shrink: 0;
      flex-grow: 1;
      margin: 0 .5rem 1rem;
      height: fit-content;

      .item {
        padding: .5rem;
        color: var(--theme-content-accent-color);
        border-radius: .5rem;
        cursor: pointer;

        &:hover {
          color: var(--theme-caption-color);
          background-color: var(--theme-button-bg-focused);
        }
      }
    }

    .popup-bg {
      position: absolute;
      top: 0;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: var(--theme-card-bg);
      border-radius: 1.25rem;
      backdrop-filter: blur(15px);
      box-shadow: var(--theme-card-shadow);
      z-index: -1;
    }
  }
</style>
