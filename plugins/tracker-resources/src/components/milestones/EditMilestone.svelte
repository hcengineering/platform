<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { AttachmentStyleBoxEditor } from '@hcengineering/attachment-resources'
  import { getClient } from '@hcengineering/presentation'
  import { Milestone } from '@hcengineering/tracker'
  import { DatePresenter, EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  import MilestoneStatusEditor from './MilestoneStatusEditor.svelte'
  import QueryIssuesList from '../issues/edit/QueryIssuesList.svelte'

  export let object: Milestone

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldLabel = ''
  let rawLabel = ''

  async function change<K extends keyof Milestone> (field: K, value: Milestone[K]) {
    await client.update(object, { [field]: value })
  }

  async function changeStartDate (value: number | null | undefined): Promise<void> {
    await client.update(object, { startDate: value ?? null })
  }
  async function changeTargetDate (value: number | null | undefined): Promise<void> {
    if (value === null || value === undefined) return
    await client.update(object, { targetDate: value })
  }

  $: if (oldLabel !== object.label) {
    oldLabel = object.label
    rawLabel = object.label
  }

  // status / startDate / targetDate are rendered in this component's body in
  // chronological order (Status → Start → Target). Hide them from the
  // auto-generated side panel so they don't appear twice.
  onMount(() =>
    dispatch('open', {
      ignoreKeys: ['label', 'description', 'attachments', 'status', 'startDate', 'targetDate']
    })
  )
  $: descriptionKey = client.getHierarchy().getAttribute(tracker.class.Component, 'description')
  let descriptionBox: AttachmentStyleBoxEditor
</script>

<EditBox
  bind:value={rawLabel}
  placeholder={tracker.string.MilestoneNamePlaceholder}
  kind="large-style"
  on:blur={async () => {
    const trimmedLabel = rawLabel.trim()

    if (trimmedLabel.length === 0) {
      rawLabel = oldLabel
    } else if (trimmedLabel !== object.label) {
      await change('label', trimmedLabel)
    }
  }}
/>

<div class="dates-row mt-4">
  <div class="date-cell">
    <span class="cell-label"><Label label={tracker.string.Status} /></span>
    <MilestoneStatusEditor value={object.status} {object} kind="regular" />
  </div>
  <div class="date-cell">
    <span class="cell-label"><Label label={tracker.string.StartDate} /></span>
    <DatePresenter
      value={object.startDate}
      editable
      kind={'regular'}
      size={'medium'}
      on:change={(e) => { void changeStartDate(e.detail) }}
    />
  </div>
  <div class="date-cell">
    <span class="cell-label"><Label label={tracker.string.TargetDate} /></span>
    <DatePresenter
      value={object.targetDate}
      editable
      kind={'regular'}
      size={'medium'}
      on:change={(e) => { void changeTargetDate(e.detail) }}
    />
  </div>
</div>

<div class="w-full mt-6">
  <AttachmentStyleBoxEditor
    focusIndex={30}
    {object}
    key={{ key: 'description', attr: descriptionKey }}
    bind:this={descriptionBox}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
</div>

<style lang="scss">
  .dates-row {
    display: flex;
    gap: 1.5rem;
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .date-cell {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 8rem;
  }
  .cell-label {
    font-size: 0.85rem;
    color: var(--theme-darker-color);
    font-weight: 500;
  }
</style>

<div class="w-full mt-6">
  <QueryIssuesList
    focusIndex={50}
    {object}
    query={{ milestone: object._id }}
    shouldSaveDraft
    hasSubIssues={true}
    viewletId={tracker.viewlet.MilestoneIssuesList}
    createParams={{ milestone: object._id }}
  >
    <svelte:fragment slot="header">
      <Label label={tracker.string.Issues} />
    </svelte:fragment>
  </QueryIssuesList>
</div>
