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
  import { Doc } from '@hcengineering/core'
  import { AttributeBarEditor, createQuery, getClient, KeyedAttribute } from '@hcengineering/presentation'
  import type { IssueTemplate } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import { getFiltredKeys, isCollectionAttr } from '@hcengineering/view-resources/src/utils'
  import tracker from '../../plugin'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import ProjectEditor from '../projects/ProjectEditor.svelte'
  import SprintEditor from '../sprints/SprintEditor.svelte'

  export let issue: IssueTemplate

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

  $: updateKeys(['title', 'description', 'priority', 'number', 'assignee', 'project', 'sprint'])
</script>

<div class="content">
  <span class="label">
    <Label label={tracker.string.Priority} />
  </span>
  <PriorityEditor value={issue} shouldShowLabel />

  <span class="label">
    <Label label={tracker.string.Assignee} />
  </span>
  <AssigneeEditor value={issue} />

  <!-- <span class="labelTop">
    <Label label={tracker.string.Labels} />
  </span> -->
  <!-- <Component is={tags.component.TagsAttributeEditor} props={{ object: issue, label: tracker.string.AddLabel }} /> -->

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
