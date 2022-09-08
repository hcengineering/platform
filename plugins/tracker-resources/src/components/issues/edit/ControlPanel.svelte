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
  import { Doc, WithLookup } from '@anticrm/core'
  import { AttributeBarEditor, createQuery, getClient, KeyedAttribute } from '@anticrm/presentation'
  import tags from '@anticrm/tags'
  import type { Issue, IssueStatus } from '@anticrm/tracker'
  import { Component, Label } from '@anticrm/ui'
  import { getFiltredKeys, isCollectionAttr } from '@anticrm/view-resources/src/utils'
  import tracker from '../../../plugin'
  import ProjectEditor from '../../projects/ProjectEditor.svelte'
  import SprintEditor from '../../sprints/SprintEditor.svelte'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import DueDateEditor from '../DueDateEditor.svelte'
  import PriorityEditor from '../PriorityEditor.svelte'
  import RelationEditor from '../RelationEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'

  export let issue: Issue
  export let issueStatuses: WithLookup<IssueStatus>[]

  const query = createQuery()
  let showIsBlocking = false
  let blockedBy: Doc[]
  $: query.query(tracker.class.Issue, { blockedBy: { _id: issue._id, _class: issue._class } }, (result) => {
    blockedBy = result
    showIsBlocking = result.length > 0
  })

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let keys: KeyedAttribute[] = []

  function updateKeys (ignoreKeys: string[]): void {
    const filtredKeys = getFiltredKeys(hierarchy, issue._class, ignoreKeys)
    keys = filtredKeys.filter((key) => !isCollectionAttr(hierarchy, key))
  }

  $: updateKeys(['title', 'description', 'priority', 'status', 'number', 'assignee', 'project', 'dueDate', 'sprint'])
</script>

<div class="content">
  <span class="label">
    <Label label={tracker.string.Status} />
  </span>

  <StatusEditor value={issue} statuses={issueStatuses} shouldShowLabel />

  {#if issue.blockedBy?.length}
    <span class="labelTop">
      <Label label={tracker.string.BlockedBy} />
    </span>
    <RelationEditor value={issue} type="blockedBy" />
  {/if}
  {#if showIsBlocking}
    <span class="labelTop">
      <Label label={tracker.string.Blocks} />
    </span>
    <RelationEditor value={issue} type="isBlocking" {blockedBy} />
  {/if}
  {#if issue.relations?.length}
    <span class="labelTop">
      <Label label={tracker.string.Related} />
    </span>
    <RelationEditor value={issue} type="relations" />
  {/if}

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

  {#if issue.sprint}
    <span class="label">
      <Label label={tracker.string.Sprint} />
    </span>
    <SprintEditor value={issue} />
  {/if}

  {#if issue.dueDate !== null}
    <div class="divider" />

    <span class="label">
      <Label label={tracker.string.DueDate} />
    </span>
    <DueDateEditor value={issue} />
  {/if}

  {#if keys.length > 0}
    <div class="divider" />
    {#each keys as key (typeof key === 'string' ? key : key.key)}
      <AttributeBarEditor {key} _class={issue._class} object={issue} showHeader={true} />
    {/each}
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
