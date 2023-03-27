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
  import { IssueStatus } from '@hcengineering/tracker'
  import { statusStore } from '../../utils'
  import IssueStatusIcon from './IssueStatusIcon.svelte'

  export let value: IssueStatus | undefined
  export let size: 'small' | 'medium' = 'small'
</script>

{#if value}
  {@const icon = $statusStore.byId.get(value._id)?.$lookup?.category?.icon}
  <div class="flex-presenter">
    {#if icon}
      <IssueStatusIcon {value} {size} />
    {/if}
    <span class="overflow-label" class:ml-2={icon !== undefined}>
      {value.name}
    </span>
  </div>
{/if}
