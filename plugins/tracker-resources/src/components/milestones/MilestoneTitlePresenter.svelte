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
  import { Milestone } from '@hcengineering/tracker'
  import { getMonthName, Icon } from '@hcengineering/ui'
  import tracker from '../../plugin'
  export let value: Milestone | undefined
</script>

{#if value}
  <span class="overflow-label flex-row-center flex-grow">
    <Icon icon={tracker.icon.Milestone} size={'small'} />
    <div class="ml-2 mr-2">
      {value.label}
    </div>
    <span class="flex flex-grow justify-end">
      {new Date(value.targetDate).getDate()}
      {getMonthName(new Date(value.targetDate), 'short')}
    </span>
  </span>
{/if}
