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
  import { Issue, Project } from '@hcengineering/tracker'
  import { statusStore } from '@hcengineering/view-resources'

  import IssueStatusIcon from '../IssueStatusIcon.svelte'
  import { getIssueId } from '../../../issues'

  export let project: Project | undefined
  export let issue: Issue
  export let size: 'small' | 'medium' | 'large' = 'small'

  $: status = $statusStore.get(issue.status)
  $: huge = size === 'medium' || size === 'large'
  $: text = project ? `${getIssueId(project, issue)} ${issue.title}` : issue.title
</script>

<div class="flex-row-center">
  {#if status}
    <div class="icon mr-2">
      <IssueStatusIcon value={status} {size} space={issue.space} />
    </div>
  {/if}
  <span class="label" class:text-base={huge}>
    <span>{text}</span>
  </span>
</div>
