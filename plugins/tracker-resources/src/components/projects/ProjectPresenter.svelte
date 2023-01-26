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
  import { getCurrentLocation, navigate } from '@hcengineering/ui'

  export let value: WithLookup<Project>
  function navigateToProject () {
    const loc = getCurrentLocation()
    loc.path[5] = value._id
    loc.path.length = 6
    navigate(loc)
  }
</script>

{#if value}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <span
    title={value.label}
    class="cursor-pointer fs-bold caption-color overflow-label clear-mins"
    on:click={navigateToProject}
  >
    {value.label}
  </span>
{/if}
