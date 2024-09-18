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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { WidgetPreference } from '@hcengineering/workbench'

  import workbench from '../../plugin'
  import { sidebarStore, SidebarVariant } from '../../sidebar'
  import WidgetsBarMini from './SidebarMini.svelte'
  import WidgetsBarExpanded from './SidebarExpanded.svelte'

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
</script>

<div class="antiPanel-component antiComponent root size-{size}" id="sidebar">
  {#if $sidebarStore.variant === SidebarVariant.MINI}
    <WidgetsBarMini {widgets} {preferences} />
  {:else if $sidebarStore.variant === SidebarVariant.EXPANDED}
    <WidgetsBarExpanded {widgets} {preferences} />
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
      width: 25rem !important;
      min-width: 25rem !important;
      max-width: 25rem !important;
    }
  }
</style>
