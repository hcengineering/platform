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
  import { createQuery } from '@hcengineering/presentation'
  import setting, { SettingsCategory } from '@hcengineering/setting'
  import {
    Component,
    Label,
    getCurrentResolvedLocation,
    resolvedLocationStore,
    navigate,
    Separator,
    defineSeparators,
    settingsSeparators,
    Scroller
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'
  import CategoryElement from './CategoryElement.svelte'

  let category: SettingsCategory | undefined
  let categoryId: string = ''

  let categories: SettingsCategory[] = []
  const account = getCurrentAccount() as PersonAccount

  export let visibleNav = true

  const settingsQuery = createQuery()
  settingsQuery.query(
    setting.class.WorkspaceSettingCategory,
    {},
    (res) => {
      categories = account.role > AccountRole.User ? res : res.filter((p) => p.secured === false)
      category = findCategory(categoryId)
    },
    { sort: { order: 1 } }
  )

  function findCategory (name: string): SettingsCategory | undefined {
    return categories.find((x) => x.name === name)
  }

  onDestroy(
    resolvedLocationStore.subscribe(async (loc) => {
      categoryId = loc.path[4]
      category = findCategory(categoryId)
    })
  )

  function selectCategory (id: string): void {
    const loc = getCurrentResolvedLocation()
    loc.path[4] = id
    loc.path.length = 5
    navigate(loc)
  }

  defineSeparators('settingWorkspace', settingsSeparators)
</script>

<div class="flex h-full clear-mins">
  {#if visibleNav}
    <div class="antiPanel-navigator filledNav indent">
      <div class="antiPanel-wrap__content">
        <div class="antiNav-header overflow-label">
          <Label label={setting.string.WorkspaceSetting} />
        </div>
        <Scroller shrink>
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
          <div class="antiNav-space" />
        </Scroller>
      </div>
    </div>
    <Separator name={'settingWorkspace'} index={0} color={'var(--theme-navpanel-border)'} />
  {/if}

  <div class="antiPanel-component filled">
    {#if category}
      <Component is={category.component} />
    {/if}
  </div>
</div>
