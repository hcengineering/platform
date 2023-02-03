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
  import core, { Account, AttachedData, Doc, generateId, Ref, SortingOrder, WithLookup } from '@hcengineering/core'
  import presentation, { getClient, KeyedAttribute } from '@hcengineering/presentation'
  import { IssueStatus, IssuePriority, Issue, Team, calcRank } from '@hcengineering/tracker'
  import { addNotification, Button, Component, EditBox } from '@hcengineering/ui'
  import tags, { TagElement, TagReference } from '@hcengineering/tags'
  import tracker from '../../../plugin'
  import AssigneeEditor from '../AssigneeEditor.svelte'
  import StatusEditor from '../StatusEditor.svelte'
  import PriorityEditor from '../PriorityEditor.svelte'
  import EstimationEditor from '../timereport/EstimationEditor.svelte'
  import { AttachmentStyledBox } from '@hcengineering/attachment-resources'
  import IssueNotification from '../IssueNotification.svelte'
  import { translate } from '@hcengineering/platform'

  export let parentIssue: Issue
  export let issueStatuses: WithLookup<IssueStatus>[]
  export let currentTeam: Team

  const dispatch = createEventDispatcher()
  const client = getClient()

  let newIssue: AttachedData<Issue> = getIssueDefaults()
  let thisRef: HTMLDivElement
  let focusIssueTitle: () => void
  let labels: TagReference[] = []
  let descriptionBox: AttachmentStyledBox

  let objectId: Ref<Issue> = generateId()
  const key: KeyedAttribute = {
    key: 'labels',
    attr: client.getHierarchy().getAttribute(tracker.class.Issue, 'labels')
  }

  function getIssueDefaults (): AttachedData<Issue> {
    return {
      title: '',
      description: '',
      assignee: null,
      project: null,
      number: 0,
      rank: '',
      status: '' as Ref<IssueStatus>,
      priority: IssuePriority.NoPriority,
      dueDate: null,
      comments: 0,
      subIssues: 0,
      parents: [],
      sprint: parentIssue.sprint,
      estimation: 0,
      reportedTime: 0,
      reports: 0,
      childInfo: [],
      workDayLength: currentTeam.workDayLength,
      defaultTimeReportDay: currentTeam.defaultTimeReportDay
    }
  }

  function resetToDefaults () {
    newIssue = getIssueDefaults()
    labels = []
    focusIssueTitle?.()
    objectId = generateId()
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
    loading = true
    try {
      const space = currentTeam._id
      const lastOne = await client.findOne<Issue>(
        tracker.class.Issue,
        { space },
        { sort: { rank: SortingOrder.Descending } }
      )
      const incResult = await client.updateDoc(
        tracker.class.Team,
        core.space.Space,
        space,
        { $inc: { sequence: 1 } },
        true
      )

      const value: AttachedData<Issue> = {
        ...newIssue,
        title: getTitle(newIssue.title),
        number: (incResult as any).object.sequence,
        rank: calcRank(lastOne, undefined),
        project: parentIssue.project,
        parents: [{ parentId: parentIssue._id, parentTitle: parentIssue.title }, ...parentIssue.parents]
      }

      await client.addCollection(
        tracker.class.Issue,
        space,
        parentIssue._id,
        parentIssue._class,
        'subIssues',
        value,
        objectId
      )

      await descriptionBox.createAttachments()

      for (const label of labels) {
        await client.addCollection(label._class, label.space, objectId, tracker.class.Issue, 'labels', {
          title: label.title,
          color: label.color,
          tag: label.tag
        })
      }

      addNotification(await translate(tracker.string.IssueCreated, {}), getTitle(newIssue.title), IssueNotification, {
        issueId: objectId,
        subTitlePostfix: (await translate(tracker.string.Created, { value: 1 })).toLowerCase()
      })
    } finally {
      resetToDefaults()
      loading = false
    }
  }

  function addTagRef (tag: TagElement): void {
    labels = [
      ...labels,
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
  $: canSave = getTitle(newIssue.title ?? '').length > 0
  $: if (!newIssue.status && currentTeam?.defaultIssueStatus) {
    newIssue.status = currentTeam.defaultIssueStatus
  }
</script>

<div bind:this={thisRef} class="flex-col root">
  <div class="flex-row-top">
    <div id="status-editor" class="mr-1">
      <StatusEditor
        value={newIssue}
        statuses={issueStatuses}
        kind="transparent"
        size="medium"
        justify="center"
        tooltipAlignment="bottom"
        on:change={({ detail }) => (newIssue.status = detail)}
      />
    </div>
    <div class="w-full flex-col content">
      <EditBox
        bind:value={newIssue.title}
        bind:focusInput={focusIssueTitle}
        placeholder={tracker.string.IssueTitlePlaceholder}
        focus
      />
      <div class="mt-4">
        {#key objectId}
          <AttachmentStyledBox
            bind:this={descriptionBox}
            {objectId}
            refContainer={thisRef}
            _class={tracker.class.Issue}
            space={currentTeam._id}
            alwaysEdit
            showButtons
            maxHeight={'20vh'}
            bind:content={newIssue.description}
            placeholder={tracker.string.IssueDescriptionPlaceholder}
            on:changeSize={() => dispatch('changeContent')}
          />
        {/key}
      </div>
    </div>
  </div>
  <div class="mt-4 flex-between">
    <div class="buttons-group xsmall-gap">
      <!-- <SpaceSelector _class={tracker.class.Team} label={tracker.string.Team} bind:space /> -->
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
      <EstimationEditor kind={'no-border'} size={'small'} value={newIssue} />
    </div>
    <div class="buttons-group small-gap">
      <Button label={presentation.string.Cancel} size="small" kind="transparent" on:click={close} />
      <Button
        {loading}
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
