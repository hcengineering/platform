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
  import { Person } from '@hcengineering/contact'
  import { Data, Doc, Ref, generateId } from '@hcengineering/core'
  import { Card, KeyedAttribute, SpaceSelector, getClient } from '@hcengineering/presentation'
  import tags, { TagElement } from '@hcengineering/tags'
  import { StyledTextBox } from '@hcengineering/text-editor'
  import { Component as ComponentType, IssuePriority, IssueTemplate, Milestone, Project } from '@hcengineering/tracker'
  import { Component, EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { activeComponent, activeMilestone } from '../../issues'
  import tracker from '../../plugin'
  import ComponentSelector from '../ComponentSelector.svelte'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import MilestoneSelector from '../milestones/MilestoneSelector.svelte'
  import ProjectPresenter from '../projects/ProjectPresenter.svelte'
  import EstimationEditor from './EstimationEditor.svelte'
  import SubIssueTemplates from './IssueTemplateChilds.svelte'

  export let space: Ref<Project>
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Person> | null = null
  export let component: Ref<ComponentType> | null = $activeComponent ?? null
  export let milestone: Ref<Milestone> | null = $activeMilestone ?? null
  export let relatedTo: Doc | undefined

  let labels: TagElement[] = []

  let objectId: Ref<IssueTemplate> = generateId()
  let object: Data<IssueTemplate> = {
    title: '',
    description: '',
    assignee,
    component,
    milestone,
    priority,
    estimation: 0,
    children: [],
    labels: [],
    comments: 0,
    attachments: 0,
    relations: []
  }

  const dispatch = createEventDispatcher()
  const client = getClient()

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  $: _space = space

  $: canSave = getTitle(object.title ?? '').length > 0

  function getTitle (value: string) {
    return value.trim()
  }

  export function canClose (): boolean {
    return !canSave
  }

  async function createIssueTemplate () {
    if (!canSave) {
      return
    }

    const value: Data<IssueTemplate> = {
      title: getTitle(object.title),
      description: object.description,
      assignee: object.assignee,
      component: object.component,
      milestone: object.milestone,
      priority: object.priority,
      estimation: object.estimation,
      children: object.children,
      comments: 0,
      attachments: 0,
      labels: labels.map((it) => it._id),
      relations: relatedTo !== undefined ? [{ _id: relatedTo._id, _class: relatedTo._class }] : []
    }

    await client.createDoc(tracker.class.IssueTemplate, _space, value, objectId)
    objectId = generateId()
  }

  const handleComponentIdChanged = (componentId: Ref<ComponentType> | null | undefined) => {
    if (componentId === undefined) {
      return
    }

    object = { ...object, component: componentId }
  }

  const handleMilestoneIdChanged = (milestoneId: Ref<Milestone> | null | undefined) => {
    if (milestoneId === undefined) {
      return
    }

    object = { ...object, milestone: milestoneId }
  }

  function addTagRef (tag: TagElement): void {
    labels = [...labels, tag]
  }
</script>

<Card
  label={tracker.string.NewProcess}
  okAction={createIssueTemplate}
  {canSave}
  okLabel={tracker.string.SaveProcess}
  gap={'gapV-4'}
  on:close={() => {
    dispatch('close')
  }}
  on:changeContent
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Project}
      label={tracker.string.Project}
      bind:space={_space}
      kind={'regular'}
      size={'large'}
      component={ProjectPresenter}
      defaultIcon={tracker.icon.Home}
    />
  </svelte:fragment>
  <svelte:fragment slot="title" let:label>
    <Label {label} />
  </svelte:fragment>

  <EditBox
    bind:value={object.title}
    placeholder={tracker.string.IssueTitlePlaceholder}
    kind={'large-style'}
    autoFocus
  />
  <StyledTextBox
    alwaysEdit
    showButtons={false}
    kind={'emphasized'}
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <SubIssueTemplates
    bind:children={object.children}
    component={object.component}
    milestone={object.milestone}
    project={_space}
    maxHeight="limited"
    on:create-issue={({ detail }) => (object.children = [...object.children, detail])}
  />
  <svelte:fragment slot="pool">
    <PriorityEditor
      value={object}
      shouldShowLabel
      isEditable
      kind={'regular'}
      size={'large'}
      justify="center"
      on:change={({ detail }) => (object.priority = detail)}
    />
    <AssigneeEditor
      object={{ ...object, space }}
      kind={'regular'}
      size={'large'}
      on:change={({ detail }) => (object.assignee = detail)}
    />
    <Component
      is={tags.component.TagsDropdownEditor}
      props={{
        items: labels,
        key,
        targetClass: tracker.class.Issue,
        countLabel: tracker.string.NumberLabels,
        kind: 'regular',
        size: 'large'
      }}
      on:open={(evt) => {
        addTagRef(evt.detail)
      }}
      on:delete={(evt) => {
        labels = labels.filter((it) => it._id !== evt.detail)
      }}
    />
    <EstimationEditor kind={'regular'} size={'large'} value={object} />
    <ComponentSelector
      {space}
      value={object.component}
      onChange={handleComponentIdChanged}
      isEditable={true}
      kind={'regular'}
      size={'large'}
    />
    <MilestoneSelector
      {space}
      value={object.milestone}
      onChange={handleMilestoneIdChanged}
      kind={'regular'}
      size={'large'}
    />
  </svelte:fragment>
</Card>
