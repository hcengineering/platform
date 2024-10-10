<!--
// Copyright © 2024 Hardcore Engineering Inc.
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
  import {
    AnySvelteComponent,
    closePanel,
    getCurrentLocation,
    Icon,
    ModernTab,
    navigate,
    languageStore,
    locationToUrl
  } from '@hcengineering/ui'
  import { ComponentExtensions, getClient } from '@hcengineering/presentation'
  import { Asset, getResource, translate } from '@hcengineering/platform'
  import { WorkbenchTab } from '@hcengineering/workbench'
  import view from '@hcengineering/view'
  import { showMenu } from '@hcengineering/view-resources'

  import { closeTab, getTabDataByLocation, getTabLocation, selectTab, tabIdStore, tabsStore } from '../workbench'
  import workbench from '../plugin'

  export let tab: WorkbenchTab

  const client = getClient()

  let name: string | undefined = tab.name
  let icon: Asset | AnySvelteComponent | undefined
  let iconProps: Record<string, any> | undefined

  async function updateTabData (tab: WorkbenchTab, lang: string): Promise<void> {
    const tabLoc = $tabIdStore === tab._id ? getCurrentLocation() : getTabLocation(tab)
    const data = await getTabDataByLocation(tabLoc)

    name = data.name ?? (await translate(data.label, {}, lang))
    if (data.iconComponent !== undefined) {
      icon = await getResource(data.iconComponent)
    } else {
      icon = data.icon
    }
    iconProps = data.iconProps

    if (tab.name !== name && tab.location === locationToUrl(tabLoc)) {
      await client.update(tab, { name })
    }
  }

  $: void updateTabData(tab, $languageStore)

  function handleClickTab (): void {
    selectTab(tab._id)
    const tabLoc = getTabLocation(tab)
    const loc = getCurrentLocation()
    const currentApp = loc.path[2]
    const newApp = tabLoc.path[2]
    if (newApp && newApp !== currentApp) {
      closePanel(false)
    }
    navigate(tabLoc)
  }

  function handleCloseTab (): void {
    void closeTab(tab)
  }

  function handleMenu (event: MouseEvent): void {
    event.preventDefault()
    event.stopPropagation()

    showMenu(event, { object: tab, baseMenuClass: workbench.class.WorkbenchTab })
  }
</script>

<ModernTab
  label={name}
  {icon}
  {iconProps}
  maxSize="12rem"
  highlighted={$tabIdStore === tab._id}
  canClose={$tabsStore.length > 1 && !tab.isPinned}
  on:click={handleClickTab}
  on:close={handleCloseTab}
  on:contextmenu={handleMenu}
>
  <svelte:fragment slot="prefix">
    <ComponentExtensions extension={workbench.extensions.WorkbenchTabExtensions} props={{ tab }} />
  </svelte:fragment>
  <svelte:fragment slot="postfix">
    {#if tab.isPinned}
      <Icon icon={view.icon.PinTack} size="x-small" />
    {/if}
  </svelte:fragment>
</ModernTab>
