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
  import { WithLookup } from '@anticrm/core'
  import type { Issue, IssueStatus } from '@anticrm/tracker'
  import { Component, Label } from '@anticrm/ui'
  import tags from '@anticrm/tags'
  import tracker from '../../../plugin'
  import PriorityEditor from '../PriorityEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import ProjectEditor from '../../projects/ProjectEditor.svelte'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import DueDateEditor from '../DueDateEditor.svelte'

  export let issue: Issue
  export let issueStatuses: WithLookup<IssueStatus>[]
</script>

<div class="content">
  <span class="label">
    <Label label={tracker.string.Status} />
  </span>
  <StatusEditor value={issue} statuses={issueStatuses} shouldShowLabel />

  <span class="label">
    <Label label={tracker.string.Priority} />
  </span>
  <PriorityEditor value={issue} shouldShowLabel />

  <span class="label">
    <Label label={tracker.string.Assignee} />
  </span>
  <AssigneeEditor value={issue} />

  <span class="labelTop">
    <Label label={tracker.string.Labels} />
  </span>
  <Component is={tags.component.TagsAttributeEditor} props={{ object: issue, label: tracker.string.AddLabel }} />

  <div class="divider" />

  <span class="label">
    <Label label={tracker.string.Project} />
  </span>
  <ProjectEditor value={issue} />

  {#if issue.dueDate !== null}
    <div class="divider" />

    <span class="label">
      <Label label={tracker.string.DueDate} />
    </span>
    <DueDateEditor value={issue} />
  {/if}
</div>

<style lang="scss">
  .content {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-flow: row;
    justify-content: start;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    width: 100%;
    height: min-content;
  }

  .divider {
    grid-column: 1 / 3;
    height: 1px;
    background-color: var(--divider-color);
  }
  .labelTop {
    align-self: start;
    margin-top: 0.385rem;
  }
</style>
