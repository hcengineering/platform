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
  import type { Issue } from '@anticrm/tracker'
  import { IssueStatus } from '@anticrm/tracker'
  import { Icon } from '@anticrm/ui'
  import tracker from '../../plugin'

  export let value: Issue

  const statusIconsMap = Object.freeze({
    [IssueStatus.Backlog]: tracker.icon.StatusBacklog,
    [IssueStatus.Todo]: tracker.icon.StatusTodo,
    [IssueStatus.InProgress]: tracker.icon.StatusInProgress,
    [IssueStatus.Done]: tracker.icon.StatusDone,
    [IssueStatus.Canceled]: tracker.icon.StatusCanceled
  })
</script>

{#if value}
  <div class="titlePresenter">
    <div class="icon">
      <Icon icon={statusIconsMap[value.status]} size={'small'} />
    </div>
    <span class="label nowrap" title={value.title}>{value.title}</span>
  </div>
{/if}

<style lang="scss">
  .titlePresenter {
    display: flex;
    align-items: center;

    .icon {
      margin-right: 0.5rem;
    }
  }
</style>
