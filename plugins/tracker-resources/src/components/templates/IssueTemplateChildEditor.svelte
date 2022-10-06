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
  import { generateId, Ref } from '@hcengineering/core'
  import presentation, { getClient, KeyedAttribute } from '@hcengineering/presentation'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import { StyledTextArea } from '@hcengineering/text-editor'
  import { IssuePriority, IssueTemplateChild, Project, Sprint } from '@hcengineering/tracker'
  import { Button, Component, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import tracker from '../../plugin'
  import AssigneeEditor from '../issues/AssigneeEditor.svelte'
  import PriorityEditor from '../issues/PriorityEditor.svelte'
  import EstimationEditor from './EstimationEditor.svelte'

  export let sprint: Ref<Sprint> | null = null
  export let project: Ref<Project> | null = null
  export let childIssue: IssueTemplateChild | undefined = undefined
  export let showBorder = false

  const dispatch = createEventDispatcher()
  const client = getClient()

  let newIssue: IssueTemplateChild = childIssue !== undefined ? { ...childIssue } : getIssueDefaults()
  let thisRef: HTMLDivElement
  let focusIssueTitle: () => void
  let labels: TagElement[] = []

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.IssueTemplate, 'labels')
  }

  function getIssueDefaults (): IssueTemplateChild {
    return {
      id: generateId(),
      title: '',
      description: '',
      assignee: null,
      project: null,
      priority: IssuePriority.NoPriority,
      dueDate: null,
      sprint: sprint,
      estimation: 0
    }
  }

  function resetToDefaults () {
    newIssue = getIssueDefaults()
    focusIssueTitle?.()
  }

  function getTitle (value: string) {
    return value.trim()
  }

  function close () {
    dispatch('close')
  }

  async function createIssue () {
    if (!canSave) {
      return
    }

    const value: IssueTemplateChild = {
      ...newIssue,
      title: getTitle(newIssue.title),
      project: project ?? null,
      labels: labels.map((it) => it._id)
    }
    if (childIssue === undefined) {
      dispatch('create', value)
    } else {
      dispatch('close', value)
    }

    resetToDefaults()
  }

  function addTagRef (tag: TagElement): void {
    labels = [...labels, tag]
  }

  $: thisRef && thisRef.scrollIntoView({ behavior: 'smooth' })
  $: canSave = getTitle(newIssue.title ?? '').length > 0

  $: labelRefs = labels.map((it) => ({ ...(it as unknown as TagReference), _id: generateId(), tag: it._id }))
</script>

<div bind:this={thisRef} class="flex-col root" class:antiPopup={showBorder}>
  <div class="flex-row-top">
    <div class="w-full flex-col content">
      <EditBox
        bind:value={newIssue.title}
        bind:focusInput={focusIssueTitle}
        maxWidth="33rem"
        placeholder={tracker.string.IssueTitlePlaceholder}
        focus
      />
      <div class="mt-4">
        {#key newIssue.description}
          <StyledTextArea
            bind:content={newIssue.description}
            placeholder={tracker.string.IssueDescriptionPlaceholder}
            showButtons={false}
          />
        {/key}
      </div>
    </div>
  </div>
  <div class="mt-4 flex-between">
    <div class="buttons-group xsmall-gap">
      <PriorityEditor
        value={newIssue}
        shouldShowLabel
        isEditable
        kind="no-border"
        size="small"
        justify="center"
        on:change={({ detail }) => (newIssue.priority = detail)}
      />
      {#key newIssue.assignee}
        <AssigneeEditor
          value={newIssue}
          size="small"
          kind="no-border"
          on:change={({ detail }) => (newIssue.assignee = detail)}
        />
      {/key}
      <EstimationEditor
        kind={'no-border'}
        size={'small'}
        bind:value={newIssue}
        on:change={(evt) => {
          newIssue.estimation = evt.detail
        }}
      />
      <Component
        is={tags.component.TagsDropdownEditor}
        props={{
          items: labelRefs,
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
    </div>
    <div class="buttons-group small-gap">
      <Button label={presentation.string.Cancel} size="small" kind="transparent" on:click={close} />
      <Button
        disabled={!canSave}
        label={presentation.string.Save}
        size="small"
        kind="no-border"
        on:click={createIssue}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .root {
    padding: 0.5rem 1.5rem;
    background-color: var(--theme-bg-accent-color);
    border: 1px solid var(--theme-button-border-enabled);
    border-radius: 0.5rem;
    overflow: hidden;

    .content {
      padding-top: 0.3rem;
    }
  }
</style>
