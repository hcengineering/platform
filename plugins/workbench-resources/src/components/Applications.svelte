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
  import { hideApplication, showApplication } from '../utils'
  import App from './App.svelte'

  export let active: Ref<Application> | undefined
  export let apps: Application[] = []
  export let direction: 'vertical' | 'horizontal' = 'vertical'
  export let shown: boolean = false

  let loaded: boolean = false
  let hiddenAppsIds: Ref<Application>[] = []
  const hiddenAppsIdsQuery = createQuery()
  hiddenAppsIdsQuery.query(workbench.class.HiddenApplication, {}, (res) => {
    hiddenAppsIds = res.map((r) => r.attachedTo)
    loaded = true
  })
</script>

<div class="flex-{direction === 'horizontal' ? 'row-center' : 'col'} clear-mins apps-{direction} relative">
  {#if loaded}
    <Scroller
      invertScroll
      padding={direction === 'horizontal' ? '.25rem 0' : '0 .5rem'}
      horizontal={direction === 'horizontal'}
      contentDirection={direction}
      buttons
    >
      <div class="apps-space-{direction}" />
      {#each apps.filter((it) => (shown ? true : !hiddenAppsIds.includes(it._id))) as app}
        <NavLink app={app.alias}>
          <App
            selected={app._id === active}
            icon={app.icon}
            label={app.label}
            hidden={hiddenAppsIds.includes(app._id)}
            editable={shown}
            on:visible={(res) => {
              if (res.detail === undefined) return
              if (res.detail) showApplication(app)
              else hideApplication(app)
            }}
          />
        </NavLink>
      {/each}
      <div class="apps-space-{direction}" />
    </Scroller>
  {/if}
</div>

<style lang="scss">
  .apps-horizontal {
    justify-content: center;
    margin: 0 1rem;
    padding: 0 0.25rem;
    min-height: 4rem;
  }
  .apps-vertical {
    margin: 1rem 0;
    padding: 0.25rem 0;
    min-width: 4rem;
  }
  .apps-space {
    &-vertical {
      min-height: 0.25rem;
      height: 0.25rem;
    }
    &-horizontal {
      min-width: 0.25rem;
      width: 0.25rem;
    }
  }
</style>
