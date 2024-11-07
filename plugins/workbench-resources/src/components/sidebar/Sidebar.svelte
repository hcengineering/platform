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
  import { addTxListener, createQuery, getClient, removeTxListener } from '@hcengineering/presentation'
  import { WidgetPreference, SidebarEvent, TxSidebarEvent, OpenSidebarWidgetParams } from '@hcengineering/workbench'
  import { Tx } from '@hcengineering/core'
  import { onMount } from 'svelte'
  import { panelstore, deviceOptionsStore as deviceInfo } from '@hcengineering/ui'

  import workbench from '../../plugin'
  import { createWidgetTab, openWidget, sidebarStore, SidebarVariant } from '../../sidebar'
  import SidebarMini from './SidebarMini.svelte'
  import SidebarExpanded from './SidebarExpanded.svelte'

  const client = getClient()

  const widgets = client.getModel().findAllSync(workbench.class.Widget, {})
  const preferencesQuery = createQuery()

  let preferences: WidgetPreference[] = []
  $: preferencesQuery.query(workbench.class.WidgetPreference, {}, (res) => {
    preferences = res
  })

  $: mini = $sidebarStore.variant === SidebarVariant.MINI
  $: if ((!mini || mini) && $panelstore.panel?.refit !== undefined) $panelstore.panel.refit()

  function txListener (tx: Tx): void {
    if (tx._class === workbench.class.TxSidebarEvent) {
      const evt = tx as TxSidebarEvent
      if (evt.event === SidebarEvent.OpenWidget) {
        const params = evt.params as OpenSidebarWidgetParams
        const widget = client.getModel().findAllSync(workbench.class.Widget, { _id: params.widget })[0]
        if (widget === undefined) return
        if (params.tab !== undefined) {
          createWidgetTab(widget, params.tab)
        } else {
          openWidget(widget)
        }
      }
    }
  }

  onMount(() => {
    addTxListener(txListener)
    return () => {
      removeTxListener(txListener)
    }
  })
</script>

<div
  id="sidebar"
  class="antiPanel-application vertical sidebar-container"
  class:mini
  class:float={$deviceInfo.navigator.float}
>
  {#if mini}
    <SidebarMini {widgets} {preferences} />
  {:else if $sidebarStore.variant === SidebarVariant.EXPANDED}
    <SidebarExpanded {widgets} {preferences} />
  {/if}
</div>

<style lang="scss">
  .sidebar-container {
    overflow: hidden;
    flex-direction: row;
    min-width: 25rem;
    border-radius: var(--medium-BorderRadius);

    &.mini:not(.float) {
      width: 3.5rem !important;
      min-width: 3.5rem !important;
      max-width: 3.5rem !important;
    }
    &.mini.float {
      justify-content: flex-end;
    }
  }
  @media (max-width: 1024px) {
    .sidebar-container {
      width: 100%;
      border: 1px solid var(--theme-navpanel-divider);
      border-radius: var(--medium-BorderRadius);
    }
  }
</style>
