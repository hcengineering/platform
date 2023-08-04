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
  import { PersonAccount } from '@hcengineering/contact'
  import { AccountRole, getCurrentAccount } from '@hcengineering/core'
  import login, { loginId } from '@hcengineering/login'
  import { setMetadata } from '@hcengineering/platform'
  import presentation, { closeClient, createQuery } from '@hcengineering/presentation'
  import setting, { SettingsCategory } from '@hcengineering/setting'
  import {
    Component,
    Label,
    fetchMetadataLocalStorage,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore,
    setMetadataLocalStorage,
    showPopup
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import CategoryElement from './CategoryElement.svelte'

  export let visibileNav = true
  let category: SettingsCategory | undefined
  let categoryId: string = ''

  let categories: SettingsCategory[] = []
  const account = getCurrentAccount() as PersonAccount

  const settingsQuery = createQuery()
  settingsQuery.query(
    setting.class.SettingsCategory,
    {},
    (res) => {
      categories = account.role > AccountRole.User ? res : res.filter((p) => p.secured === false)
      category = findCategory(categoryId)
    },
    { sort: { order: 1 } }
  )

  onDestroy(
    resolvedLocationStore.subscribe(async (loc) => {
      categoryId = loc.path[3]
      category = findCategory(categoryId)
    })
  )

  function findCategory (name: string): SettingsCategory | undefined {
    return categories.find((x) => x.name === name)
  }
  function selectCategory (id: string): void {
    const loc = getCurrentResolvedLocation()
    loc.path[3] = id
    loc.path.length = 4
    navigate(loc)
  }
  function signOut (): void {
    const tokens = fetchMetadataLocalStorage(login.metadata.LoginTokens)
    if (tokens !== null) {
      const loc = getCurrentResolvedLocation()
      delete tokens[loc.path[1]]
      setMetadataLocalStorage(login.metadata.LoginTokens, tokens)
    }
    setMetadata(presentation.metadata.Token, null)
    setMetadataLocalStorage(login.metadata.LoginEndpoint, null)
    setMetadataLocalStorage(login.metadata.LoginEmail, null)
    closeClient()
    navigate({ path: [loginId] })
  }
  function selectWorkspace (): void {
    navigate({ path: [loginId, 'selectWorkspace'] })
  }
  function inviteWorkspace (): void {
    showPopup(login.component.InviteLink, {})
  }
</script>

<div class="flex h-full">
  {#if visibileNav}
    <div class="antiPanel-navigator filledNav indent">
      <div class="antiNav-header">
        <span class="fs-title overflow-label">
          <Label label={setting.string.Settings} />
        </span>
      </div>
      {#each categories as category, i}
        {#if i > 0 && categories[i - 1].group !== category.group}
          <div class="antiNav-divider short line" />
        {/if}
        <CategoryElement
          icon={category.icon}
          label={category.label}
          selected={category.name === categoryId}
          expandable={category._id === setting.ids.Setting}
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
  {/if}

  <div class="antiPanel-component filled">
    {#if category}
      <Component
        is={category.component}
        props={{
          visibileNav
        }}
      />
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
