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
  import { AnySvelteComponent, Location, ModernTab, navigate } from '@hcengineering/ui'
  import { getClient } from '@hcengineering/presentation'
  import { Asset, getResource, IntlString } from '@hcengineering/platform'
  import { type Application, WorkbenchTab } from '@hcengineering/workbench'
  import { Class, Doc, Ref } from '@hcengineering/core'
  import view from '@hcengineering/view'
  import { parseLinkId, showMenu } from '@hcengineering/view-resources'
  import { Analytics } from '@hcengineering/analytics'

  import { closeTab, getTabLocation, selectTab, tabIdStore, tabsStore } from '../workbench'
  import workbench from '../plugin'

  export let tab: WorkbenchTab

  const client = getClient()
  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  let name: string | undefined = undefined
  let label: IntlString = workbench.string.Tab
  let icon: Asset | AnySvelteComponent | undefined
  let iconProps: Record<string, any> | undefined

  async function getResolvedLocation (loc: Location, app?: Application): Promise<Location> {
    if (app === undefined) return loc
    if (app.locationResolver) {
      const resolver = await getResource(app.locationResolver)
      return (await resolver(loc))?.loc ?? loc
    }

    return loc
  }

  async function getTabName (loc: Location): Promise<string | undefined> {
    if (loc.fragment == null) return
    const hierarchy = client.getHierarchy()
    const [, id, _class] = decodeURIComponent(loc.fragment).split('|')
    if (_class == null) return

    const mixin = hierarchy.classHierarchyMixin(_class as Ref<Class<Doc>>, view.mixin.ObjectTitle)
    if (mixin === undefined) return
    const titleProvider = await getResource(mixin.titleProvider)
    try {
      const _id = await parseLinkId(linkProviders, id, _class as Ref<Class<Doc>>)
      return await titleProvider(client, _id)
    } catch (err: any) {
      Analytics.handleError(err)
      console.error(err)
    }
  }

  async function updateTabData (tab: WorkbenchTab): Promise<void> {
    const tabLoc = getTabLocation(tab)
    const alias = tabLoc.path[2]
    const application = client.getModel().findAllSync<Application>(workbench.class.Application, { alias })[0]

    if (application?.locationDataResolver) {
      const resolver = await getResource(application.locationDataResolver)
      const data = await resolver(tabLoc)
      name = data.name
      label = data.nameIntl ?? label

      if (data.iconComponent) {
        icon = await getResource(data.iconComponent)
      } else {
        icon = data.icon ?? application?.icon
      }
      iconProps = data.iconProps
    } else {
      const special = tabLoc.path[3]
      const specialLabel = application?.navigatorModel?.specials?.find((s) => s.id === special)?.label
      const resolvedLoc = await getResolvedLocation(tabLoc, application)

      label = specialLabel ?? application?.label ?? workbench.string.Tab
      name = await getTabName(resolvedLoc)
      icon = application?.icon
      iconProps = undefined
    }
  }

  $: void updateTabData(tab)

  function handleClickTab (): void {
    selectTab(tab._id)
    const tabLoc = getTabLocation(tab)
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
  labelIntl={label}
  label={name}
  {icon}
  {iconProps}
  maxSize="12rem"
  highlighted={$tabIdStore === tab._id}
  canClose={$tabsStore.length > 1 && !tab.isPinned}
  on:click={handleClickTab}
  on:close={handleCloseTab}
  on:contextmenu={handleMenu}
/>
