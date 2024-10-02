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

  $: widgetId = $sidebarStore.widget
  $: widget = widgets.find((it) => it._id === widgetId)
  $: size = $sidebarStore.variant === SidebarVariant.MINI ? 'mini' : widget?.size

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

<div class="antiPanel-component antiComponent root size-{size}" id="sidebar">
  {#if $sidebarStore.variant === SidebarVariant.MINI}
    <SidebarMini {widgets} {preferences} />
  {:else if $sidebarStore.variant === SidebarVariant.EXPANDED}
    <SidebarExpanded {widgets} {preferences} />
  {/if}
</div>

<style lang="scss">
  .root {
    position: relative;
    background-color: var(--theme-panel-color);

    &.size-mini {
      width: 3.5rem !important;
      min-width: 3.5rem !important;
      max-width: 3.5rem !important;
    }

    &.size-small {
      width: 10rem !important;
      min-width: 10rem !important;
      max-width: 10rem !important;
    }

    &.size-medium {
      width: 20rem !important;
      min-width: 20rem !important;
      max-width: 20rem !important;
    }
  }
</style>
