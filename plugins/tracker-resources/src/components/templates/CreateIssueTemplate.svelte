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
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import { Employee } from '@hcengineering/contact'
  import { Data, Doc, generateId, Ref } from '@hcengineering/core'
  import { Card, getClient, KeyedAttribute, SpaceSelector } from '@hcengineering/presentation'
  import tags, { TagElement } from '@hcengineering/tags'
  import { IssuePriority, IssueTemplate, Project, Sprint, Team } from '@hcengineering/tracker'
  import { Button, Component, EditBox, IconAttachment, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { activeProject, activeSprint } from '../../issues'
  import tracker from '../../plugin'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import ProjectSelector from '../ProjectSelector.svelte'
  import SprintSelector from '../sprints/SprintSelector.svelte'
  import EstimationEditor from './EstimationEditor.svelte'
  import SubIssueTemplates from './IssueTemplateChilds.svelte'

  export let space: Ref<Team>
  export let priority: IssuePriority = IssuePriority.NoPriority
  export let assignee: Ref<Employee> | null = null
  export let project: Ref<Project> | null = $activeProject ?? null
  export let sprint: Ref<Sprint> | null = $activeSprint ?? null
  export let relatedTo: Doc | undefined

  let labels: TagElement[] = []

  let objectId: Ref<IssueTemplate> = generateId()
  let object: Data<IssueTemplate> = {
    title: '',
    description: '',
    assignee,
    project,
    sprint,
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

  let descriptionBox: AttachmentStyledBox

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  $: _space = space
  let spaceRef: Team | undefined

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
      project: object.project,
      sprint: object.sprint,
      priority: object.priority,
      estimation: object.estimation,
      children: object.children,
      comments: 0,
      attachments: 0,
      labels: labels.map((it) => it._id),
      relations: relatedTo !== undefined ? [{ _id: relatedTo._id, _class: relatedTo._class }] : []
    }

    await client.createDoc(tracker.class.IssueTemplate, _space, value, objectId)

    await descriptionBox.createAttachments()
    objectId = generateId()
  }

  const handleProjectIdChanged = (projectId: Ref<Project> | null | undefined) => {
    if (projectId === undefined) {
      return
    }

    object = { ...object, project: projectId }
  }

  const handleSprintIdChanged = (sprintId: Ref<Sprint> | null | undefined) => {
    if (sprintId === undefined) {
      return
    }

    object = { ...object, sprint: sprintId }
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
  on:close={() => {
    dispatch('close')
  }}
  createMore={false}
>
  <svelte:fragment slot="header">
    <SpaceSelector
      _class={tracker.class.Team}
      label={tracker.string.Team}
      bind:space={_space}
      on:space={(evt) => {
        spaceRef = evt.detail
      }}
    />
  </svelte:fragment>
  <svelte:fragment slot="title" let:label>
    <Label {label} />
  </svelte:fragment>

  <EditBox bind:value={object.title} placeholder={tracker.string.IssueTitlePlaceholder} kind={'large-style'} focus />
  <AttachmentStyledBox
    bind:this={descriptionBox}
    {objectId}
    _class={tracker.class.Issue}
    space={_space}
    alwaysEdit
    showButtons={false}
    emphasized
    bind:content={object.description}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
  <SubIssueTemplates
    bind:children={object.children}
    project={object.project}
    sprint={object.sprint}
    teamId={spaceRef?.identifier ?? 'TSK'}
    maxHeight="limited"
  />
  <svelte:fragment slot="pool">
    <PriorityEditor
      value={object}
      shouldShowLabel
      isEditable
      kind="no-border"
      size="small"
      justify="center"
      on:change={({ detail }) => (object.priority = detail)}
    />
    <AssigneeEditor
      value={object}
      size="small"
      kind="no-border"
      width={'min-content'}
      on:change={({ detail }) => (object.assignee = detail)}
    />
    <Component
      is={tags.component.TagsDropdownEditor}
      props={{
        items: labels,
        key,
        targetClass: tracker.class.Issue,
        countLabel: tracker.string.NumberLabels
      }}
      on:open={(evt) => {
        addTagRef(evt.detail)
      }}
      on:delete={(evt) => {
        labels = labels.filter((it) => it._id !== evt.detail)
      }}
    />
    <EstimationEditor kind={'no-border'} size={'small'} value={object} />
    <ProjectSelector value={object.project} onChange={handleProjectIdChanged} />
    <SprintSelector value={object.sprint} onChange={handleSprintIdChanged} useProject={object.project ?? undefined} />
  </svelte:fragment>
  <svelte:fragment slot="footer">
    <Button
      icon={IconAttachment}
      kind={'transparent'}
      on:click={() => {
        descriptionBox.attach()
      }}
    />
  </svelte:fragment>
</Card>
