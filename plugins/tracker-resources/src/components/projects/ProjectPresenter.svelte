<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { WithLookup } from '@hcengineering/core'
  import { Project } from '@hcengineering/tracker'
  import { getCurrentLocation, Icon, navigate, tooltip } from '@hcengineering/ui'
  import tracker from '../../plugin'

  export let value: WithLookup<Project>
  export let withIcon = false
  export let onClick: () => void | undefined

  function navigateToProject () {
    if (onClick) {
      onClick()
    }

    const loc = getCurrentLocation()
    loc.path[4] = 'projects'
    loc.path[5] = value._id
    loc.path.length = 6
    navigate(loc)
  }
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="flex" on:click={navigateToProject}>
    {#if withIcon}
      <div class="mr-2" use:tooltip={{ label: tracker.string.Project }}>
        <Icon icon={tracker.icon.Projects} size={'small'} />
      </div>
    {/if}
    <span title={value.label} class="fs-bold cursor-pointer caption-color overflow-label clear-mins">
      {value.label}
    </span>
  </div>
{/if}
