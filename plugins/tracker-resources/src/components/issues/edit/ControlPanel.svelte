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
  import { createEventDispatcher } from 'svelte'
  import { Ref, WithLookup } from '@anticrm/core'
  import { UserBox } from '@anticrm/presentation'
  import contact from '@anticrm/contact'
  import type { Issue, IssueStatus, Team } from '@anticrm/tracker'
  import { Button, Label } from '@anticrm/ui'
  import tracker from '../../../plugin'
  import PriorityEditor from '../PriorityEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import DatePresenter from '@anticrm/ui/src/components/calendar/DatePresenter.svelte'

  export let teamId: Ref<Team>
  export let issue: Issue
  export let issueStatuses: WithLookup<IssueStatus>[]
  export let direction: string

  const dispatch = createEventDispatcher()

  function change<K extends keyof Issue> (field: K, value: Issue[K]) {
    dispatch('issueChange', { field, value })
  }
</script>

<div class="content">
  <span class="label">
    <Label label={tracker.string.Status} />
  </span>
  <StatusEditor
    value={issue}
    statuses={issueStatuses}
    currentSpace={teamId}
    shouldSaveOnChange={false}
    shouldShowLabel
    on:change={({ detail }) => detail && change('status', detail)}
  />

  <span class="label">
    <Label label={tracker.string.Priority} />
  </span>
  <PriorityEditor
    value={issue}
    currentSpace={teamId}
    shouldSaveOnChange={false}
    shouldShowLabel
    on:change={({ detail }) => detail !== undefined && change('priority', detail)}
  />

  <span class="label">
    <Label label={tracker.string.Assignee} />
  </span>
  <UserBox
    _class={contact.class.Employee}
    label={tracker.string.Assignee}
    placeholder={tracker.string.Assignee}
    value={issue.assignee}
    allowDeselect
    titleDeselect={tracker.string.Unassigned}
    size={'large'}
    kind={'link'}
    width={'100%'}
    justify={'left'}
    on:change={({ detail }) => change('assignee', detail)}
  />

  <span class="label">
    <Label label={tracker.string.Labels} />
  </span>
  <Button
    label={tracker.string.Labels}
    icon={tracker.icon.Labels}
    size={'large'}
    kind={'link'}
    width={'100%'}
    justify={'left'}
  />

  <div class="divider" />

  <span class="label">
    <Label label={tracker.string.Project} />
  </span>
  <Button
    label={tracker.string.Project}
    icon={tracker.icon.Projects}
    size={'large'}
    kind={'link'}
    width={'100%'}
    justify={'left'}
  />

  {#if issue.dueDate !== null}
    <div class="divider" />

    <span class="label">
      <Label label={tracker.string.DueDate} />
    </span>
    <DatePresenter bind:value={issue.dueDate} editable on:change={({ detail }) => change('dueDate', detail)} />
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
</style>
