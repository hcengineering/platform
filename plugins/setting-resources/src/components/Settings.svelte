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
  import { AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import login, { loginId } from '@hcengineering/login'
  import { getClient, createQuery } from '@hcengineering/presentation'
  import settingPlg from '../plugin'
  import setting, { SettingsCategory, SettingsEvents } from '@hcengineering/setting'
  import {
    Component,
    Label,
    NavGroup,
    NavItem,
    Scroller,
    Separator,
    defineSeparators,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore,
    settingsSeparators,
    showPopup,
    type AnyComponent,
    deviceOptionsStore as deviceInfo,
    deviceWidths
  } from '@hcengineering/ui'
  import {
    closeWidget,
    NavFooter,
    openWidget,
    minimizeSidebar,
    sidebarStore,
    logOut
  } from '@hcengineering/workbench-resources'
  import workbench from '@hcengineering/workbench'
  import { ComponentType, onDestroy, onMount } from 'svelte'
  import { clearSettingsStore, settingsStore, type SettingsStore } from '../store'
  import { Analytics } from '@hcengineering/analytics'

  export let workbenchWidth: number = 0

  const client = getClient()

  let category: SettingsCategory | undefined
  let categoryId: string = ''

  let categories: SettingsCategory[] = []
  const account = getCurrentAccount()
  let asideComponent: ComponentType | AnyComponent | null = null
  let asideProps: object | null = null

  const settingsQuery = createQuery()
  settingsQuery.query(
    setting.class.SettingsCategory,
    {},
    (res) => {
      categories = res.filter((p) => hasAccountRole(account, p.role))
      category = findCategory(categoryId)
    },
    { sort: { order: 1 } }
  )

  onDestroy(() => {
    clearSettingsStore()
  })
  onDestroy(
    resolvedLocationStore.subscribe((loc) => {
      void (async (loc) => {
        categoryId = loc.path[3]
        category = findCategory(categoryId)
      })(loc)
    })
  )
  onMount(() => {
    setTimeout(() => {
      if (categoryId === undefined) $deviceInfo.navigator.visible = true
    }, 500)
  })

  function findCategory (name: string): SettingsCategory | undefined {
    return categories.find((x) => x.name === name)
  }
  function selectCategory (id: string): void {
    clearSettingsStore()
    const loc = getCurrentResolvedLocation()
    if (loc.path[3] === id) {
      loc.path.length = 3
    } else {
      loc.path[3] = id
      loc.path.length = 4
    }
    navigate(loc)
  }
  function signOut (): void {
    Analytics.handleEvent(SettingsEvents.SignOut)
    void logOut()
  }
  function selectWorkspace (): void {
    Analytics.handleEvent(SettingsEvents.SelectWorkspace)
    navigate({ path: [loginId, 'selectWorkspace'] })
  }
  function inviteWorkspace (): void {
    Analytics.handleEvent(SettingsEvents.InviteToWorkspace)
    showPopup(login.component.InviteLink, {})
  }

  const updatedStore = (ss: SettingsStore): ComponentType | AnyComponent | null => {
    asideProps = ss.props ?? null
    return ss.component === undefined ? null : ss.component
  }
  $: asideComponent = updatedStore($settingsStore)
  let moveASide: boolean = false
  $: if (workbenchWidth < deviceWidths[3] && !moveASide) moveASide = true
  else if (workbenchWidth >= deviceWidths[3] && moveASide) moveASide = false

  const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: settingPlg.ids.SettingsWidget })[0]
  $: if (moveASide && asideComponent != null && $sidebarStore.widget !== widget._id) {
    openWidget(widget, { component: asideComponent, ...asideProps }, { active: true, openedByUser: true })
  } else if (moveASide && asideComponent == null && $sidebarStore.widget === widget._id) {
    closeWidget(widget._id)
    minimizeSidebar()
  } else if (!moveASide && asideComponent != null && $sidebarStore.widget === widget._id) {
    closeWidget(widget._id)
  }

  let replacedPanel: HTMLElement
  $: $deviceInfo.replacedPanel = replacedPanel
  onDestroy(() => ($deviceInfo.replacedPanel = undefined))

  defineSeparators('setting', settingsSeparators)
</script>

{#if $deviceInfo.navigator.visible}
  <div
    class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
      ? 'portrait'
      : 'landscape'} border-left"
    class:border-right={category?.component === undefined}
    class:fly={$deviceInfo.navigator.float}
  >
    <div class="antiPanel-wrap__content hulyNavPanel-container">
      <div class="hulyNavPanel-header">
        <Label label={setting.string.Settings} />
      </div>

      <Scroller shrink>
        {#each categories as _category}
          {#if _category.extraComponents?.navigation && (_category.expandable ?? _category._id === setting.ids.Setting)}
            <NavGroup
              _id={_category._id}
              label={_category.label}
              categoryName={_category.name}
              highlighted={_category.name === categoryId}
              tools={_category.extraComponents?.tools}
            >
              <Component
                is={_category.extraComponents?.navigation}
                props={{
                  kind: 'navigation',
                  categoryName: _category.name
                }}
              />
            </NavGroup>
          {:else}
            <NavItem
              icon={_category.icon}
              label={_category.label}
              selected={_category.name === categoryId}
              on:click={() => {
                selectCategory(_category.name)
              }}
            />
          {/if}
        {/each}
      </Scroller>

      <NavFooter split>
        <NavItem
          icon={setting.icon.SelectWorkspace}
          label={setting.string.SelectWorkspace}
          on:click={selectWorkspace}
        />
        {#if hasAccountRole(account, AccountRole.User)}
          <NavItem
            icon={setting.icon.InviteWorkspace}
            label={setting.string.InviteWorkspace}
            on:click={inviteWorkspace}
          />
        {/if}
        <NavItem icon={setting.icon.Signout} label={setting.string.Signout} on:click={signOut} />
      </NavFooter>
    </div>
    <Separator
      name={'setting'}
      float={$deviceInfo.navigator.float ? 'navigator' : true}
      index={0}
      color={'transparent'}
    />
  </div>
  <Separator
    name={'setting'}
    float={$deviceInfo.navigator.float}
    index={0}
    color={'transparent'}
    separatorSize={0}
    short
  />
{/if}

<div
  bind:this={replacedPanel}
  class="antiPanel-component filledNav"
  class:border-right={category?.component === undefined}
  style:flex-direction={'row'}
>
  {#if category}
    <Component is={category.component} props={{ kind: 'content' }} />
  {/if}
</div>
{#if asideComponent != null && !moveASide}
  <Separator name={'setting'} index={1} color={'transparent'} separatorSize={0} short />
  <div class="hulySidePanel-container">
    {#key asideProps}
      {#if typeof asideComponent === 'string'}
        <Component is={asideComponent} props={{ ...asideProps }} />
      {:else}
        <svelte:component this={asideComponent} {...asideProps} />
      {/if}
    {/key}
  </div>
{/if}
