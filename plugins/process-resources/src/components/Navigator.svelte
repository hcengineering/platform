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
  import { cardId } from '@hcengineering/card'
  import { Process } from '@hcengineering/process'
  import { deviceOptionsStore as deviceInfo, NavItem, Scroller } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import { NavFooter, NavHeader, SavedView } from '@hcengineering/workbench-resources'
  import plugin from '../plugin'
  import { Special } from '../types'

  export let currentSpace: string
  export let processes: Process[]

  export let specials: Special[]

  let menuSelection: boolean = false
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={plugin.string.Processes} />
    {#each specials as special}
      <NavLink space={special._id}>
        <NavItem
          _id={special._id}
          label={special.label}
          isFold
          empty
          selected={!menuSelection && special._id === currentSpace}
        />
      </NavLink>
    {/each}

    <SavedView alias={cardId} on:select={(res) => (menuSelection = res.detail)} />

    {#if processes.length > 0}
      <div class="antiNav-divider line" />
      <Scroller shrink>
        {#each processes as process}
          <NavLink space={process._id}>
            <NavItem
              _id={process._id}
              title={process.name}
              isFold
              empty
              selected={!menuSelection && process._id === currentSpace}
            />
          </NavLink>
        {/each}
      </Scroller>
    {/if}

    <div class="mt-2" />

    <NavFooter split />
  </div>
</div>
