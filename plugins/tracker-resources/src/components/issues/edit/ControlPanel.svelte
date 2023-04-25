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
  import { EmployeeAccount } from '@hcengineering/contact'
  import { EmployeeBox, employeeAccountByIdStore, employeeByIdStore } from '@hcengineering/contact-resources'
  import core, { ClassifierKind, Doc, Mixin, Ref } from '@hcengineering/core'
  import { AttributeBarEditor, KeyedAttribute, createQuery, getClient } from '@hcengineering/presentation'

  import tags from '@hcengineering/tags'
  import type { Issue } from '@hcengineering/tracker'
  import { Component, Label } from '@hcengineering/ui'
  import { ObjectBox, getFiltredKeys, isCollectionAttr } from '@hcengineering/view-resources'
  import tracker from '../../../plugin'
  import ComponentEditor from '../../components/ComponentEditor.svelte'
  import SprintEditor from '../../sprints/SprintEditor.svelte'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import DueDateEditor from '../DueDateEditor.svelte'
  import PriorityEditor from '../PriorityEditor.svelte'
  import RelationEditor from '../RelationEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'

  export let issue: Issue
  export let showAllMixins: boolean = false

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

  let mixins: Mixin<Doc>[] = []

  $: getMixins(issue, showAllMixins)

  function getMixins (object: Issue, showAllMixins: boolean): void {
    const descendants = hierarchy.getDescendants(core.class.Doc).map((p) => hierarchy.getClass(p))

    mixins = descendants.filter(
      (m) =>
        m.kind === ClassifierKind.MIXIN &&
        (hierarchy.hasMixin(object, m._id) ||
          (showAllMixins && hierarchy.isDerived(tracker.class.Issue, hierarchy.getBaseClass(m._id))))
    )
  }

  function getMixinKeys (mixin: Ref<Mixin<Doc>>): KeyedAttribute[] {
    const filtredKeys = getFiltredKeys(hierarchy, mixin, [], issue._class)
    const res = filtredKeys.filter((key) => !isCollectionAttr(hierarchy, key))
    return res
  }

  $: updateKeys([
    'title',
    'description',
    'priority',
    'status',
    'number',
    'assignee',
    'component',
    'dueDate',
    'sprint',
    'relations',
    'blockedBy'
  ])

  let account: EmployeeAccount | undefined
  $: employee = account && $employeeByIdStore.get(account.employee)

  $: account = $employeeAccountByIdStore.get(issue.createdBy as Ref<EmployeeAccount>)
</script>

<div class="content">
  {#if issue.template?.template}
    <span class="label">
      <Label label={tracker.string.IssueTemplate} />
    </span>
    <ObjectBox
      _class={tracker.class.IssueTemplate}
      value={issue.template?.template}
      size={'small'}
      kind={'link'}
      width={'100%'}
      label={tracker.string.NoIssueTemplate}
      icon={tracker.icon.Issues}
      searchField={'title'}
      allowDeselect={true}
      showNavigate={false}
      readonly
      docProps={{ disableClick: true }}
    />
  {/if}

  <span class="label">
    <Label label={tracker.string.Status} />
  </span>

  <StatusEditor value={issue} shouldShowLabel />

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
    <Label label={core.string.CreatedBy} />
  </span>
  <EmployeeBox
    value={employee?._id}
    label={core.string.CreatedBy}
    kind={'link'}
    size={'large'}
    width={'100%'}
    showNavigate={false}
    readonly
  />

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
    <Label label={tracker.string.Component} />
  </span>
  <ComponentEditor value={issue} />

  <span class="label">
    <Label label={tracker.string.Sprint} />
  </span>
  <SprintEditor value={issue} />

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
      <AttributeBarEditor {key} _class={issue._class} object={issue} showHeader={true} size={'large'} />
    {/each}
  {/if}

  {#each mixins as mixin}
    <div class="divider" />
    {#each getMixinKeys(mixin._id) as key (typeof key === 'string' ? key : key.key)}
      <AttributeBarEditor
        {key}
        _class={mixin._id}
        object={hierarchy.as(issue, mixin._id)}
        showHeader={true}
        size={'large'}
      />
    {/each}
  {/each}
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
