<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Ref } from '@hcengineering/core'
  import { createQuery } from '@hcengineering/presentation'
  import { Scroller } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import type { Application } from '@hcengineering/workbench'
  import workbench from '@hcengineering/workbench'
  import AppItem from './AppItem.svelte'

  export let active: Ref<Application> | undefined
  export let apps: Application[] = []
  export let direction: 'vertical' | 'horizontal' = 'vertical'

  let loaded: boolean = false
  let hiddenAppsIds: Ref<Application>[] = []
  const hiddenAppsIdsQuery = createQuery()
  hiddenAppsIdsQuery.query(workbench.class.HiddenApplication, {}, (res) => {
    hiddenAppsIds = res.map((r) => r.attachedTo)
    loaded = true
  })

  $: filteredApps = apps.filter((it) => !hiddenAppsIds.includes(it._id))
  $: topApps = filteredApps.filter((it) => it.position === 'top')
  $: bottomdApps = filteredApps.filter((it) => it.position !== 'top')
</script>

<div class="flex-{direction === 'horizontal' ? 'row-center' : 'col-center'} clear-mins apps-{direction} relative">
  {#if loaded}
    <Scroller
      invertScroll
      padding={direction === 'horizontal' ? '.75rem .5rem' : '.5rem .75rem'}
      gap={direction === 'horizontal' ? 'gap-1' : 'gapV-1'}
      horizontal={direction === 'horizontal'}
      contentDirection={direction}
      buttons={'union'}
    >
      {#each topApps as app}
        <NavLink app={app.alias} shrink={0}>
          <AppItem selected={app._id === active} icon={app.icon} label={app.label} />
        </NavLink>
      {/each}
      <div class="divider" />
      {#each bottomdApps as app}
        <NavLink app={app.alias} shrink={0}>
          <AppItem selected={app._id === active} icon={app.icon} label={app.label} />
        </NavLink>
      {/each}
      <div class="apps-space-{direction}" />
    </Scroller>
  {/if}
</div>

<style lang="scss">
  .apps-horizontal {
    justify-content: center;
    margin: 0 0.5rem 0 0.25rem;
    height: var(--app-panel-width);
    min-height: 4rem;

    .divider {
      margin-left: 0.5rem;
      width: 1px;
      height: 2.25rem;
    }
  }
  .apps-vertical {
    margin-bottom: 0.5rem;
    width: var(--app-panel-width);
    min-width: 4rem;

    .divider {
      margin-top: 1rem;
      width: 2.25rem;
      height: 1px;
    }
  }
  .divider {
    flex-shrink: 0;
    background-color: var(--theme-navpanel-icons-divider);
  }
  .apps-space {
    &-vertical {
      min-height: 0.5rem;
      height: 0.5rem;
    }
    &-horizontal {
      min-width: 0.5rem;
      width: 0.5rem;
    }
  }
</style>
