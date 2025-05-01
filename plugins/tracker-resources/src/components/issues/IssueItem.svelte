<!--
// Copyright © 2020, 2021 Anticrm Platform Contributors.
// Copyright © 2021 Hardcore Engineering Inc.
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
  import type { Issue } from '@hcengineering/tracker'
  import { FixedColumn, statusStore } from '@hcengineering/view-resources'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let value: WithLookup<Issue>
  $: st = $statusStore.byId.get(value.status)
</script>

<div class="flex-row-center h-8">
  <!-- <Icon icon={tracker.icon.TrackerApplication} size={'medium'} /> -->
  <FixedColumn key="object-popup-issue-status">
    {#if st}
      <IssueStatusIcon value={st} taskType={value.kind} size={'small'} space={value.space} />
    {/if}
  </FixedColumn>
  <span class="ml-2 max-w-120 overflow-label">
    {value.identifier} - {value.title}
  </span>
</div>
