<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import {
    AnyComponent,
    Breadcrumb,
    Component,
    Header,
    Location,
    NavItem,
    Scroller,
    Separator,
    defineSeparators,
    getCurrentResolvedLocation,
    navigate,
    resolvedLocationStore,
    twoPanelsSeparators
  } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import { type IntlString } from '@hcengineering/platform'

  import ResourceUsage from './ResourceUsage.svelte'
  import Subscriptions from './Subscriptions.svelte'

  import plugin from '../plugin'

  interface SettingGroup {
    key: string
    icon: string
    label: IntlString
    component: AnyComponent
  }

  const groups: SettingGroup[] = [
    {
      key: 'usage',
      icon: plugin.icon.Billing,
      label: plugin.string.ResourceUsage,
      component: ResourceUsage
    },
    {
      key: 'subscriptions',
      icon: plugin.icon.Subscriptions,
      label: plugin.string.Subscriptions,
      component: Subscriptions
    }
  ]

  let currentGroupKey = groups[0].key
  let currentGroup = groups[0]

  const unsubscribeLocation = resolvedLocationStore.subscribe((loc) => {
    void (async (loc: Location): Promise<void> => {
      const key = loc.path[5]
      currentGroup = groups.find((g) => g.key === key) ?? groups[0]
      currentGroupKey = currentGroup.key
    })(loc)
  })

  onDestroy(() => {
    unsubscribeLocation()
  })

  defineSeparators('billingSettings', twoPanelsSeparators)
</script>

<div class="hulyComponent">
  <Header adaptive={'disabled'}>
    <Breadcrumb icon={plugin.icon.Billing} label={plugin.string.Billing} size={'large'} isCurrent />
  </Header>
  <div class="hulyComponent-content__container columns">
    <div class="hulyComponent-content__column navigation py-2">
      <Scroller shrink>
        {#each groups as group}
          <NavItem
            icon={group.icon}
            label={group.label}
            selected={group.key === currentGroupKey}
            on:click={() => {
              currentGroupKey = group.key
              currentGroup = group
              const loc = getCurrentResolvedLocation()
              loc.path[5] = group.key
              loc.path.length = 6
              navigate(loc)
            }}
          />
        {/each}
      </Scroller>
    </div>

    <Separator name="billingSettings" index={0} color={'var(--theme-divider-color)'} />

    <div class="hulyComponent-content__column content">
      <Component is={currentGroup.component} />
    </div>
  </div>
</div>
