<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import type { Milestone } from '@hcengineering/tracker'
  import { FixedColumn } from '@hcengineering/view-resources'
  import MilestoneStatusIcon from './MilestoneStatusIcon.svelte'

  export let value: WithLookup<Milestone>
</script>

<div class="flex-row-center h-8">
  <FixedColumn key="object-popup-milestone-status">
    <MilestoneStatusIcon value={value.status} size={'small'} />
  </FixedColumn>
  <span class="ml-2 max-w-120 overflow-label">
    {value.label}
  </span>
</div>
