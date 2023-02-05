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
  import { IconDownOutline, NavLink, Scroller } from '@hcengineering/ui'
  import type { Application } from '@hcengineering/workbench'
  import workbench from '@hcengineering/workbench'
  import { hideApplication, showApplication } from '../utils'
  import App from './App.svelte'

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

  let shown: boolean = false
</script>

<div class="flex-{direction === 'horizontal' ? 'row-center' : 'col'} clear-mins apps-{direction} relative">
  {#if loaded}
    <Scroller
      invertScroll
      padding={direction === 'horizontal' ? '.25rem 0' : '0 .5rem'}
      horizontal={direction === 'horizontal'}
      contentDirection={direction}
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
    <div class="thinButton {direction}" class:shown on:click={() => (shown = !shown)}>
      <div class="clear-mins pointer-events-none" class:rotate90={direction === 'horizontal'}>
        <IconDownOutline size={'medium'} />
      </div>
    </div>
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

  .thinButton {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    transform-origin: center center;
    border-radius: 0.5rem;
    opacity: 0.2;
    cursor: pointer;

    transition-property: opacity, transform;
    transition-timing-function: var(--timing-main);
    transition-duration: 0.1s;

    &.vertical {
      top: 100%;
      left: 50%;
      width: 2.5rem;
      transform: translateX(-50%) scale(0.6) rotate(0deg);
      &:hover {
        transform: translateX(-50%) scale(0.8);
      }
    }
    &.horizontal {
      left: 100%;
      top: 50%;
      height: 2.5rem;
      transform: translateY(-50%) scale(0.6);
      &:hover {
        transform: translateY(-50%) scale(0.8);
      }
      &.shown {
        transform: translateY(-50%) scale(0.9) rotate(180deg);
        &:hover {
          transform: translateY(-50%) scale(1) rotate(180deg);
        }
      }
    }

    &:hover {
      transform: translateX(-50%) scale(0.8);
      background-color: var(--accent-bg-color);
      opacity: 0.9;
    }

    &.shown {
      transform: translateX(-50%) scale(0.9) rotate(180deg);
      opacity: 0.8;

      &:hover {
        transform: translateX(-50%) scale(1) rotate(180deg);
        background-color: var(--accent-bg-color);
        opacity: 1;
      }
    }
  }
  .rotate90 {
    transform-origin: center center;
    transform: rotate(-90deg);
  }
</style>
