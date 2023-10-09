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
  import { EditBox, Label } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import tracker from '../../plugin'
  import QueryIssuesList from '../issues/edit/QueryIssuesList.svelte'

  export let object: Milestone

  const dispatch = createEventDispatcher()
  const client = getClient()

  let oldLabel = ''
  let rawLabel = ''

  async function change<K extends keyof Milestone> (field: K, value: Milestone[K]) {
    await client.update(object, { [field]: value })
  }

  $: if (oldLabel !== object.label) {
    oldLabel = object.label
    rawLabel = object.label
  }

  onMount(() => dispatch('open', { ignoreKeys: ['label', 'description', 'attachments'] }))
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

<div class="w-full mt-6">
  <AttachmentStyleBoxEditor
    focusIndex={30}
    {object}
    key={{ key: 'description', attr: descriptionKey }}
    bind:this={descriptionBox}
    placeholder={tracker.string.IssueDescriptionPlaceholder}
  />
</div>

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
