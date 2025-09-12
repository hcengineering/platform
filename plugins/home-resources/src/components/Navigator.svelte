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
  import { homeId } from '@hcengineering/home'
  import { deviceOptionsStore as deviceInfo, NavItem } from '@hcengineering/ui'
  import { NavLink } from '@hcengineering/view-resources'
  import { NavFooter, NavHeader, SavedView } from '@hcengineering/workbench-resources'
  import plugin from '../plugin'
  import { Special } from '../types'

  export let currentSpace: string

  export let specials: Special[]

  let menuSelection: boolean = false
</script>

<div
  class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal' ? 'portrait' : 'landscape'} border-left"
  class:fly={$deviceInfo.navigator.float}
>
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={plugin.string.Home} />
    {#each specials as special}
      <NavLink space={special._id} app={homeId}>
        <NavItem
          _id={special._id}
          label={special.label}
          icon={special.icon}
          empty
          selected={!menuSelection && special._id === currentSpace}
        />
      </NavLink>
    {/each}

    <SavedView alias={homeId} on:select={(res) => (menuSelection = res.detail)} />

    <div class="mt-2" />

    <NavFooter split />
  </div>
</div>
