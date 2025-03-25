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
  import { panelstore } from '@hcengineering/ui'
  import { WidgetPreference } from '@hcengineering/workbench'

  import workbench from '../../plugin'
  import { sidebarStore, SidebarVariant } from '../../sidebar'
  import SidebarExpanded from './SidebarExpanded.svelte'
  import SidebarMini from './SidebarMini.svelte'

  const client = getClient()

  const widgets = client.getModel().findAllSync(workbench.class.Widget, {})
  const preferencesQuery = createQuery()

  let preferences: WidgetPreference[] = []
  $: preferencesQuery.query(workbench.class.WidgetPreference, {}, (res) => {
    preferences = res
  })

  $: mini = $sidebarStore.variant === SidebarVariant.MINI
  $: if ((!mini || mini) && $panelstore.panel?.refit !== undefined) $panelstore.panel.refit()
</script>

<div id="sidebar" class="antiPanel-application vertical sidebar-container" class:mini={mini || $sidebarStore.float}>
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
    border-radius: 0 var(--medium-BorderRadius) var(--medium-BorderRadius) 0;

    &.mini {
      justify-content: flex-end;
      width: calc(3.5rem + 1px) !important;
      min-width: calc(3.5rem + 1px) !important;
      max-width: calc(3.5rem + 1px) !important;
    }
  }
  @media (max-width: 1024px) {
    .sidebar-container {
      width: 100%;
      border-left-color: transparent;
    }
  }
  @media (max-width: 480px) {
    :global(.mobile-theme) .sidebar-container {
      border-right: none;
      border-bottom-right-radius: 0 !important;
    }
  }
</style>
