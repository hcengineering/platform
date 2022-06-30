<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { getClient } from '@anticrm/presentation'
  import setting, { SettingsCategory } from '@anticrm/setting'
  import {
    Component,
    getCurrentLocation,
    Label,
    location,
    navigate,
    setMetadataLocalStorage,
    showPopup
  } from '@anticrm/ui'
  import { onDestroy } from 'svelte'
  import CategoryElement from './CategoryElement.svelte'
  import login from '@anticrm/login'

  const client = getClient()

  let category: SettingsCategory | undefined
  let categoryId: string = ''

  let categories: SettingsCategory[] = []
  client.findAll(setting.class.SettingsCategory, {}, { sort: { order: 1 } }).then((s) => {
    categories = s
    category = findCategory(categoryId)
  })

  onDestroy(
    location.subscribe(async (loc) => {
      categoryId = loc.path[2]
      category = findCategory(categoryId)
    })
  )

  function findCategory (name: string): SettingsCategory | undefined {
    return categories.find((x) => x.name === name)
  }
  function selectCategory (id: string): void {
    const loc = getCurrentLocation()
    loc.path[2] = id
    loc.path.length = 3
    navigate(loc)
  }
  function signOut (): void {
    setMetadataLocalStorage(login.metadata.LoginToken, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    setMetadataLocalStorage(login.metadata.CurrentWorkspace, null)
    navigate({ path: [login.component.LoginApp] })
  }
  function selectWorkspace (): void {
    navigate({ path: [login.component.LoginApp, 'selectWorkspace'] })
  }
  function inviteWorkspace (): void {
    showPopup(login.component.InviteLink, {})
  }
</script>

<div class="flex h-full">
  <div class="antiPanel-navigator filled indent">
    <div class="antiNav-header">
      <span class="fs-title overflow-label">
        <Label label={setting.string.Settings} />
      </span>
    </div>
    {#each categories as category}
      <CategoryElement
        icon={category.icon}
        label={category.label}
        selected={category.name === categoryId}
        on:click={() => {
          selectCategory(category.name)
        }}
      />
    {/each}
    <div class="signout">
      <CategoryElement icon={setting.icon.Signout} label={setting.string.Signout} on:click={signOut} />
      <CategoryElement
        icon={login.icon.InviteWorkspace}
        label={setting.string.InviteWorkspace}
        on:click={inviteWorkspace}
      />
      <CategoryElement
        icon={setting.icon.SelectWorkspace}
        label={setting.string.SelectWorkspace}
        on:click={selectWorkspace}
      />
    </div>
  </div>

  <div class="antiPanel-component border-left filled">
    {#if category}
      <Component is={category.component} />
    {/if}
  </div>
</div>

<style lang="scss">
  .signout {
    display: flex;
    flex-direction: column-reverse;
    flex-grow: 1;
    margin-bottom: 2rem;
  }
</style>
