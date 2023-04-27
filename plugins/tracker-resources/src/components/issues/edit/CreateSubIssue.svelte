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
  import core, { Account, AttachedData, Doc, generateId, Ref, SortingOrder } from '@hcengineering/core'
  import { translate } from '@hcengineering/platform'
  import presentation, { DraftController, getClient, KeyedAttribute } from '@hcengineering/presentation'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import { calcRank, Issue, IssueDraft, IssuePriority, Project } from '@hcengineering/tracker'
  import { addNotification, Button, ButtonSize, Component, deviceOptionsStore, EditBox } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { generateIssueShortLink, getIssueId } from '../../../issues'
  import tracker from '../../../plugin'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import IssueNotification from '../IssueNotification.svelte'
  import PriorityEditor from '../PriorityEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import EstimationEditor from '../timereport/EstimationEditor.svelte'
  import { onDestroy } from 'svelte'

  export let parentIssue: Issue
  export let currentProject: Project
  export let shouldSaveDraft: boolean = false

  const draftController = new DraftController<IssueDraft>(`${parentIssue._id}_subIssue`)
  const draft = shouldSaveDraft ? draftController.get() : undefined
  const dispatch = createEventDispatcher()
  const client = getClient()
  onDestroy(() => draftController.destroy())

  let object = draft ?? getIssueDefaults()

  let thisRef: HTMLDivElement
  let focusIssueTitle: () => void
  let descriptionBox: AttachmentStyledBox

  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  function getIssueDefaults (): IssueDraft {
    return {
      _id: generateId(),
      space: currentProject._id,
      labels: [],
      subIssues: [],
      status: currentProject.defaultIssueStatus,
      assignee: currentProject.defaultAssignee ?? null,
      title: '',
      description: '',
      component: parentIssue.component,
      priority: IssuePriority.NoPriority,
      dueDate: null,
      sprint: parentIssue.sprint,
      estimation: 0
    }
  }

  const empty = {
    space: currentProject._id,
    status: currentProject.defaultIssueStatus,
    assignee: currentProject.defaultAssignee ?? null,
    component: parentIssue.component,
    priority: IssuePriority.NoPriority,
    sprint: parentIssue.sprint
  }

  function objectChange (object: IssueDraft, empty: any) {
    if (shouldSaveDraft) {
      draftController.save(object, empty)
    }
  }

  $: objectChange(object, empty)

  function resetToDefaults () {
    object = getIssueDefaults()
    focusIssueTitle?.()
  }

  $: objectId = object._id

  function getTitle (value: string) {
    return value.trim()
  }

  function close () {
    draftController.remove()
    dispatch('close')
  }

  async function createIssue () {
    if (!canSave) {
      return
    }
    const _id: Ref<Issue> = generateId()
    loading = true
    try {
      const space = currentProject._id
      const lastOne = await client.findOne<Issue>(tracker.class.Issue, {}, { sort: { rank: SortingOrder.Descending } })
      const incResult = await client.updateDoc(
        tracker.class.Project,
        core.space.Space,
        space,
        { $inc: { sequence: 1 } },
        true
      )

      const value: AttachedData<Issue> = {
        ...object,
        comments: 0,
        subIssues: 0,
        createOn: Date.now(),
        reportedTime: 0,
        reports: 0,
        childInfo: [],
        labels: 0,
        status: object.status ?? currentProject.defaultIssueStatus,
        title: getTitle(object.title),
        number: (incResult as any).object.sequence,
        rank: calcRank(lastOne, undefined),
        parents: [{ parentId: parentIssue._id, parentTitle: parentIssue.title }, ...parentIssue.parents]
      }

      await client.addCollection(
        tracker.class.Issue,
        space,
        parentIssue._id,
        parentIssue._class,
        'subIssues',
        value,
        _id
      )

      await descriptionBox.createAttachments(_id)

      for (const label of object.labels) {
        await client.addCollection(label._class, label.space, _id, tracker.class.Issue, 'labels', {
          title: label.title,
          color: label.color,
          tag: label.tag
        })
      }

      addNotification(await translate(tracker.string.IssueCreated, {}), getTitle(object.title), IssueNotification, {
        issueId: _id,
        subTitlePostfix: (await translate(tracker.string.Created, { value: 1 })).toLowerCase(),
        issueUrl: currentProject && generateIssueShortLink(getIssueId(currentProject, value as Issue))
      })
      draftController.remove()
    } finally {
      resetToDefaults()
      loading = false
    }
  }

  function addTagRef (tag: TagElement): void {
    object.labels = [
      ...object.labels,
      {
        _class: tags.class.TagReference,
        _id: generateId() as Ref<TagReference>,
        attachedTo: '' as Ref<Doc>,
        attachedToClass: tracker.class.Issue,
        collection: 'labels',
        space: tags.space.Tags,
        modifiedOn: 0,
        modifiedBy: '' as Ref<Account>,
        title: tag.title,
        tag: tag._id,
        color: tag.color
      }
    ]
  }

  let loading = false

  $: thisRef && thisRef.scrollIntoView({ behavior: 'smooth' })
  $: canSave = getTitle(object.title ?? '').length > 0
  $: if (!object.status && currentProject?.defaultIssueStatus) {
    object.status = currentProject.defaultIssueStatus
  }
  let buttonSize: ButtonSize
  $: buttonSize = $deviceOptionsStore.twoRows ? 'small' : 'large'
</script>

<div id="sub-issue-child-editor" bind:this={thisRef} class="flex-col subissue-container">
  <div class="flex-row-top subissue-content">
    <div id="status-editor" class="mr-1">
      <StatusEditor
        value={object}
        kind="transparent"
        size="medium"
        justify="center"
        tooltipAlignment="bottom"
        on:change={({ detail }) => (object.status = detail)}
      />
    </div>
    <div class="w-full flex-col content">
      <div id="sub-issue-name">
        <EditBox
          bind:value={object.title}
          bind:focusInput={focusIssueTitle}
          placeholder={tracker.string.IssueTitlePlaceholder}
          focus
        />
      </div>
      <div class="mt-4" id="sub-issue-description">
        {#key objectId}
          <AttachmentStyledBox
            bind:this={descriptionBox}
            objectId={object._id}
            refContainer={thisRef}
            _class={tracker.class.Issue}
            space={currentProject._id}
            {shouldSaveDraft}
            alwaysEdit
            showButtons
            maxHeight={'20vh'}
            bind:content={object.description}
            placeholder={tracker.string.IssueDescriptionPlaceholder}
            on:changeSize={() => dispatch('changeContent')}
          />
        {/key}
      </div>
    </div>
  </div>
  <div class="subissue-footer flex-between">
    <div class="flex-row-center gap-around-2 flex-wrap">
      <div id="sub-issue-priority">
        <PriorityEditor
          value={object}
          shouldShowLabel
          isEditable
          kind={'secondary'}
          size={buttonSize}
          justify="center"
          on:change={({ detail }) => (object.priority = detail)}
        />
      </div>
      <div id="sub-issue-assignee">
        {#key object.assignee}
          <AssigneeEditor
            value={object}
            kind={'secondary'}
            size={buttonSize}
            on:change={({ detail }) => (object.assignee = detail)}
          />
        {/key}
      </div>
      <Component
        is={tags.component.TagsDropdownEditor}
        props={{
          items: object.labels,
          key,
          targetClass: tracker.class.Issue,
          countLabel: tracker.string.NumberLabels,
          kind: 'secondary',
          size: buttonSize
        }}
        on:open={(evt) => {
          addTagRef(evt.detail)
        }}
        on:delete={(evt) => {
          object.labels = object.labels.filter((it) => it._id !== evt.detail)
        }}
      />
      <EstimationEditor kind={'secondary'} size={buttonSize} value={object} />
    </div>
    <div class="flex-row-center gap-around-2 self-end flex-no-shrink">
      <Button label={presentation.string.Cancel} kind={'secondary'} size={buttonSize} on:click={close} />
      <Button
        {loading}
        disabled={!canSave}
        label={presentation.string.Save}
        kind={'primary'}
        size={buttonSize}
        on:click={createIssue}
      />
    </div>
  </div>
</div>

<style lang="scss">
  .subissue-container {
    background-color: var(--theme-button-enabled);
    border: 1px solid var(--theme-button-border);
    border-radius: 0.25rem;
    overflow: hidden;

    .subissue-content {
      padding: 0.75rem;
      .content {
        padding-top: 0.3rem;
      }
    }
    .subissue-footer {
      padding: 0.25rem 0.5rem 0.5rem;
    }
  }
</style>
