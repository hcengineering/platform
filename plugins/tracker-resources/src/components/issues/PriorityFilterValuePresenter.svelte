<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { Asset } from '@hcengineering/platform'
  import { IssuePriority } from '@hcengineering/tracker'
  import { Icon } from '@hcengineering/ui'
  import { issuePriorities } from '../../utils'

  export let value: Map<IssuePriority, IssuePriority[]>

  const order = {
    [IssuePriority.NoPriority]: 0,
    [IssuePriority.Low]: 1,
    [IssuePriority.Medium]: 2,
    [IssuePriority.High]: 3,
    [IssuePriority.Urgent]: 4
  }

  let icons: Asset[] = []
  $: icons = Array.from(value.values())
    .map((p) => p[0])
    .sort((a, b) => order[a] - order[b])
    .map((p) => issuePriorities[p].icon)
</script>

<div class="flex-presenter">
  {#each icons as icon}
    <div class="icon small-gap flow">
      <Icon {icon} size={'small'} />
    </div>
  {/each}
</div>
