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
  import { getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { createQuery, isAdminUser } from '@hcengineering/presentation'
  import setting, { SettingsCategory } from '@hcengineering/setting'
  import {
    Component,
    Location,
    NavItem,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'
  import { clearSettingsStore } from '../store'

  export let kind: 'navigation' | 'content' | undefined
  export let categoryName: string

  let category: SettingsCategory | undefined
  let categoryId: string = ''

  let categories: SettingsCategory[] = []
  const account = getCurrentAccount()
  const admin = isAdminUser()

  const settingsQuery = createQuery()
  settingsQuery.query(
    setting.class.WorkspaceSettingCategory,
    {},
    (res) => {
      categories = res.filter((p) => hasAccountRole(account, p.role))
      if (!admin) {
        categories = categories.filter((p) => !(p.adminOnly ?? false))
      }
      category = findCategory(categoryId)
    },
    { sort: { order: 1 } }
  )

  function findCategory (name: string): SettingsCategory | undefined {
    return categories.find((x) => x.name === name)
  }

  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void (async (loc: Location): Promise<void> => {
        categoryId = loc.path[4]
        category = findCategory(categoryId)
      })(loc)
    })
  )
  onMount(() => {
    setTimeout(() => {
      if (kind === 'content' && category === undefined) $deviceInfo.navigator.visible = true
    }, 500)
  })

  function selectCategory (id: string): void {
    clearSettingsStore()
    const loc = getCurrentResolvedLocation()
    loc.path[3] = categoryName
    if (loc.path[4] === id) {
      loc.path.length = 4
    } else {
      loc.path[4] = id
      loc.path.length = 5
    }
    navigate(loc)
  }
</script>

{#if kind === 'navigation'}
  {#each categories as category}
    <NavItem
      icon={category.icon}
      label={category.label}
      selected={category.name === categoryId}
      on:click={() => {
        selectCategory(category.name)
      }}
    />
    {#if category.name === categoryId && category.extraComponents?.navigation}
      <Component is={category.extraComponents?.navigation} props={{ kind: 'navigation', categoryName: categoryId }} />
    {/if}
  {/each}
{:else if kind === 'content' && category === undefined}
  <div class="hulyComponent" />
{:else if category}
  <Component is={category.component} props={{ kind: 'content', ...category.props }} on:change />
{/if}
