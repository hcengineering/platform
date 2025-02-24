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
  import { Widget, WidgetPreference, WidgetTab } from '@hcengineering/workbench'
  import { Ref } from '@hcengineering/core'
  import {
    Component,
    resizeObserver,
    location as locationStore,
    Location,
    Header,
    Breadcrumbs,
    getCurrentLocation,
    Separator,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'

  import { closeWidgetTab, sidebarStore, SidebarVariant, WidgetState, openWidgetTab, closeWidget } from '../../sidebar'
  import WidgetsBar from './widgets/WidgetsBar.svelte'
  import SidebarTabs from './SidebarTabs.svelte'

  export let widgets: Widget[] = []
  export let preferences: WidgetPreference[] = []

  let widgetId: Ref<Widget> | undefined = undefined
  let widget: Widget | undefined = undefined
  let widgetState: WidgetState | undefined = undefined

  let tabId: string | undefined = undefined
  let tab: WidgetTab | undefined = undefined
  let tabs: WidgetTab[] = []

  $: widgetId = $sidebarStore.widget
  $: widget = widgetId !== undefined ? widgets.find((it) => it._id === widgetId) : undefined
  $: widgetState = widget !== undefined ? $sidebarStore.widgetsState.get(widget._id) : undefined

  $: tabId = widgetState?.tab
  $: tabs = widgetState?.tabs ?? []
  $: tab = tabId !== undefined ? tabs.find((it) => it.id === tabId) ?? tabs[0] : tabs[0]

  $: if ($sidebarStore.widget === undefined) {
    sidebarStore.update((s) => ({ ...s, variant: SidebarVariant.MINI }))
  }
  $: float = $sidebarStore.float

  function closeWrongTabs (loc: Location): void {
    if (widget === undefined) return
    for (const tab of tabs) {
      if (tab.allowedPath !== undefined && !tab.isPinned) {
        const path = loc.path.join('/')
        if (!path.startsWith(tab.allowedPath)) {
          void handleTabClose(tab.id, widget)
        }
      }
    }
  }

  const unsubscribe = locationStore.subscribe((loc: Location) => {
    closeWrongTabs(loc)
  })

  onMount(() => {
    closeWrongTabs(getCurrentLocation())
  })

  onDestroy(() => {
    unsubscribe()
  })

  async function handleTabClose (tabId: string, widget?: Widget): Promise<void> {
    if (widget === undefined) return
    await closeWidgetTab(widget, tabId)
  }

  function handleTabOpen (tabId: string, widget?: Widget): void {
    if (widget === undefined) return
    openWidgetTab(widget._id, tabId)
  }

  let componentHeight = '0px'
  let componentWidth = '0px'

  function resize (element: Element): void {
    componentHeight = `${element.clientHeight}px`
    componentWidth = `${element.clientWidth}px`
  }
</script>

<div class="sidebar-wrap__content{float ? ` float apps-${$deviceInfo.navigator.direction}` : ''}">
  {#if float && !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
    <Separator name={'main'} index={0} color={'var(--theme-navpanel-border)'} float={'sidebar'} />
  {/if}
  <div class="sidebar-content">
    {#if widget?.component}
      <div class="component" use:resizeObserver={resize}>
        {#if widget.headerLabel}
          <Header
            allowFullsize={false}
            type="type-aside"
            hideBefore={true}
            hideActions={false}
            hideDescription={true}
            adaptive="disabled"
            closeOnEscape={false}
            on:close={() => {
              if (widget !== undefined) {
                closeWidget(widget._id)
              }
            }}
          >
            <Breadcrumbs items={[{ label: widget.headerLabel }]} currentOnly />
          </Header>
        {/if}
        <Component
          is={widget?.component}
          props={{ tab, widgetState, height: componentHeight, width: componentWidth, widget }}
          on:close={() => {
            if (widget !== undefined) {
              closeWidget(widget._id)
            }
          }}
        />
      </div>
    {/if}
  </div>
  {#if widget !== undefined && tabs.length > 0}
    <SidebarTabs
      {tabs}
      selected={tab?.id}
      {widget}
      on:close={(e) => {
        void handleTabClose(e.detail, widget)
      }}
      on:open={(e) => {
        handleTabOpen(e.detail, widget)
      }}
    />
  {/if}
</div>
<WidgetsBar {widgets} {preferences} selected={widgetId} />

<style lang="scss">
  .sidebar-wrap__content,
  .sidebar-content {
    display: flex;
    height: 100%;
    min-width: 0;
    min-height: 0;
  }
  .sidebar-wrap__content {
    width: calc(100% - 3.5rem);
    background-color: var(--theme-panel-color);
    border-top: 1px solid transparent; // var(--theme-divider-color);
    border-right: 1px solid var(--theme-divider-color);
    border-left: none;

    &.float {
      position: absolute;
      top: 0;
      right: 3.5rem;
      border-top-color: var(--theme-divider-color);
      border-bottom: 1px solid var(--theme-divider-color);
      z-index: 440;
      filter: drop-shadow(-2px 0 5px rgba(0, 0, 0, 0.2));

      :global(.mobile-theme) & {
        overflow: hidden;
        border: 1px solid var(--theme-divider-color);
        border-radius: var(--medium-BorderRadius);
        filter: var(--theme-navpanel-shadow-mobile);

        &.apps-horizontal {
          height: calc(100% - var(--app-panel-width));
        }
        :global(.antiSeparator) {
          display: none;
        }
      }
    }
  }
  .sidebar-content {
    overflow: auto;
    flex-direction: column;
    width: 100%;
  }

  .component {
    position: relative;
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    overflow: hidden;
    background-color: var(--theme-panel-color);
  }
</style>
