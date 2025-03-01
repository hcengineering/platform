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
  import { Analytics } from '@hcengineering/analytics'
  import core, { Class, Doc, Ref, Space } from '@hcengineering/core'
  import { getMetadata, getResource } from '@hcengineering/platform'
  import { ActionContext, decodeTokenPayload, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    Component,
    Label,
    Location,
    PanelInstance,
    Popup,
    PopupAlignment,
    ResolvedLocation,
    TooltipInstance,
    areLocationsEqual,
    closePanel,
    defineSeparators,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    setResolvedLocation,
    showPanel
  } from '@hcengineering/ui'
  import view from '@hcengineering/view'
  import { ListSelectionProvider, parseLinkId, restrictionStore, updateFocus } from '@hcengineering/view-resources'
  import workbench, { Application, NavigatorModel, SpecialNavModel, ViewConfiguration } from '@hcengineering/workbench'
  import { SpaceView, buildNavModel } from '@hcengineering/workbench-resources'
  import { workbenchGuestSeparators } from '..'
  import guest from '../plugin'
  import { checkAccess } from '../utils'

  const excludedApps = getMetadata(workbench.metadata.ExcludedApplications) ?? []
  $deviceInfo.navigator.visible = false

  const client = getClient()

  async function load (): Promise<boolean> {
    const loc = getCurrentLocation()
    const token = loc.query?.token
    if (token == null) return false
    const decoded = decodeTokenPayload(token)

    const link = await client.findOne(guest.class.PublicLink, { _id: decoded.linkId })
    if (link == null) return false
    restrictionStore.set(link.restrictions)
    const mergedLoc = link.location
    mergedLoc.path[0] = loc.path[0]
    mergedLoc.path[1] = loc.path[1]
    await doSyncLoc(link.location)
    return true
  }

  let contentPanel: HTMLElement
  let panelInstance: PanelInstance
  let popupInstance: Popup

  const apps: Application[] = client
    .getModel()
    .findAllSync<Application>(workbench.class.Application, { hidden: false, _id: { $nin: excludedApps } })

  async function resolveShortLink (loc: Location): Promise<ResolvedLocation | undefined> {
    if (loc.path[2] != null && loc.path[2].trim().length > 0) {
      const app = apps.find((p) => p.alias === loc.path[2])
      if (app?.locationResolver) {
        const resolver = await getResource(app.locationResolver)
        return await resolver(loc)
      }
    }
  }

  function mergeLoc (loc: Location, resolved: ResolvedLocation): Location {
    const resolvedApp = resolved.loc.path[2]
    const resolvedSpace = resolved.loc.path[3]
    const resolvedSpecial = resolved.loc.path[4]
    if (resolvedApp === undefined) {
      loc.path = [loc.path[0], loc.path[1], ...resolved.defaultLocation.path.splice(2)]
    } else {
      loc.path[2] = resolvedApp
      if (resolvedSpace === undefined) {
        loc.path[3] = currentSpace ?? (currentSpecial as string) ?? resolved.defaultLocation.path[3]
        loc.path[4] = (currentSpecial as string) ?? resolved.defaultLocation.path[4]
      } else {
        loc.path[3] = resolvedSpace
        loc.path[4] = resolvedSpecial ?? currentSpecial ?? resolved.defaultLocation.path[4]
      }
    }
    for (let index = 0; index < loc.path.length; index++) {
      const path = loc.path[index]
      if (path === undefined) {
        loc.path.length = index
        break
      }
    }
    loc.fragment = resolved.loc.fragment ?? loc.fragment ?? resolved.defaultLocation.fragment
    return loc
  }

  let currentSpace: Ref<Space> | undefined
  let currentSpecial: string | undefined
  let specialComponent: SpecialNavModel | undefined
  let currentFragment: string | undefined = ''

  let currentApplication: Application | undefined
  let navigatorModel: NavigatorModel | undefined
  let currentView: ViewConfiguration | undefined

  function setSpaceSpecial (spaceSpecial: string | undefined): void {
    if (currentSpecial !== undefined && spaceSpecial === currentSpecial) return
    if (spaceSpecial === undefined) return
    specialComponent = getSpecialComponent(spaceSpecial)
    if (specialComponent !== undefined) {
      currentSpecial = spaceSpecial
    }
  }

  function getSpecialComponent (id: string): SpecialNavModel | undefined {
    const sp = navigatorModel?.specials?.find((x) => x.id === id)
    if (sp !== undefined) {
      return sp
    }
    for (const s of navigatorModel?.spaces ?? []) {
      const sp = s.specials?.find((x) => x.id === id)
      if (sp !== undefined) {
        return sp
      }
    }
  }

  async function syncLoc (loc: Location): Promise<void> {
    if (loc.path.length > 3 && getSpecialComponent(loc.path[3]) === undefined) {
      // resolve short links
      const resolvedLoc = await resolveShortLink(loc)
      if (resolvedLoc !== undefined && !areLocationsEqual(loc, resolvedLoc.loc)) {
        loc = mergeLoc(loc, resolvedLoc)
      }
    }
    setResolvedLocation(loc)
    const app = loc.path[2]
    const space = loc.path[3] as Ref<Space>
    const special = loc.path[4]
    const fragment = loc.fragment

    currentApplication = await client.findOne<Application>(workbench.class.Application, { alias: app })
    navigatorModel = await buildNavModel(client, currentApplication)

    if (currentSpecial === undefined || currentSpecial !== space) {
      const newSpecial = space !== undefined ? getSpecialComponent(space) : undefined
      if (newSpecial !== undefined) {
        specialComponent = newSpecial
        currentSpecial = space
      } else {
        await updateSpace(space)
        setSpaceSpecial(special)
      }
    }

    if (fragment !== currentFragment) {
      currentFragment = fragment
      if (fragment != null && fragment.trim().length > 0) {
        await setOpenPanelFocus(fragment)
      } else {
        closePanel()
      }
    }
  }

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  async function setOpenPanelFocus (fragment: string): Promise<void> {
    const props = decodeURIComponent(fragment).split('|')

    if (props.length >= 3) {
      const id = props[1]
      const _class = props[2] as Ref<Class<Doc>>
      const _id = await parseLinkId(linkProviders, id, _class)

      const doc = await client.findOne<Doc>(_class, { _id })
      if (doc !== undefined) {
        await checkAccess(doc)
        const provider = ListSelectionProvider.Find(doc._id)
        updateFocus({
          provider,
          focus: doc
        })
        showPanel(
          props[0] as AnyComponent,
          _id,
          _class,
          (props[3] ?? undefined) as PopupAlignment,
          (props[4] ?? undefined) as AnyComponent,
          false
        )
      } else {
        closePanel(false)
      }
    } else {
      closePanel(false)
    }
  }

  async function doSyncLoc (loc: Location): Promise<void> {
    await syncLoc(loc)
    await updateWindowTitle(loc)
  }

  async function updateSpace (spaceId?: Ref<Space>): Promise<void> {
    if (spaceId === currentSpace) return
    if (spaceId === undefined) return
    const space = await client.findOne<Space>(core.class.Space, { _id: spaceId })
    if (space === undefined) return
    currentSpace = spaceId
    const spaceClass = client.getHierarchy().getClass(space._class)
    const view = client.getHierarchy().as(spaceClass, workbench.mixin.SpaceView)
    currentView = view.view
  }

  async function updateWindowTitle (loc: Location): Promise<void> {
    const ws = loc.path[1]
    const docTitle = await getWindowTitle(loc)
    if (docTitle !== undefined && docTitle !== '') {
      document.title = ws == null ? docTitle : `${docTitle} - ${ws}`
    } else {
      const title = getMetadata(workbench.metadata.PlatformTitle) ?? 'Platform'
      document.title = ws == null ? title : `${ws} - ${title}`
    }
  }

  async function getWindowTitle (loc: Location): Promise<string | undefined> {
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

  defineSeparators('workbenchGuest', workbenchGuestSeparators)

  let cover: HTMLElement
</script>

{#await load() then res}
  {#if res}
    <div class="workbench-container" style:flex-direction={'row'}>
      <div class="workbench-container inner">
        <div class="antiPanel-component antiComponent" bind:this={contentPanel}>
          {#if currentApplication && currentApplication.component}
            <Component is={currentApplication.component} props={{ currentSpace }} />
          {:else if specialComponent}
            <Component
              is={specialComponent.component}
              props={{
                model: navigatorModel,
                ...specialComponent.componentProps,
                currentSpace
              }}
            />
          {:else if currentView?.component !== undefined}
            <Component is={currentView.component} props={{ ...currentView.componentProps, currentView }} />
          {:else}
            <SpaceView {currentSpace} {currentView} />
          {/if}
        </div>
      </div>
    </div>
    <div bind:this={cover} class="cover" />
    <TooltipInstance />
    <PanelInstance bind:this={panelInstance} {contentPanel} readonly={$restrictionStore.readonly} embedded>
      <svelte:fragment slot="panel-header">
        <ActionContext context={{ mode: 'panel' }} />
      </svelte:fragment>
    </PanelInstance>
    <Popup bind:this={popupInstance} {contentPanel}>
      <svelte:fragment slot="popup-header">
        <ActionContext context={{ mode: 'popup' }} />
      </svelte:fragment>
    </Popup>
  {:else}
    <div class="version-wrapper">
      <div class="antiPopup version-popup">
        <h1><Label label={guest.string.LinkWasRevoked} /></h1>
      </div>
    </div>
  {/if}
{/await}

<style lang="scss">
  .workbench-container {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
  .version-wrapper {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .version-popup {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  @media print {
    .workbench-container:has(~ .panel-instance) {
      display: none;
    }
  }
</style>
