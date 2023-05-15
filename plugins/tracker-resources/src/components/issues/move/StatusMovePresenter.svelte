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
  import { DocumentUpdate, Ref } from '@hcengineering/core'
  import { statusStore } from '@hcengineering/presentation'
  import { Issue, Project } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { findTargetStatus, issueToAttachedData } from '../../../utils'
  import StatusEditor from '../StatusEditor.svelte'
  import StatusRefPresenter from '../StatusRefPresenter.svelte'

  export let issue: Issue
  export let currentProject: Project
  export let issueToUpdate: Map<Ref<Issue>, DocumentUpdate<Issue>> = new Map()

  $: targetStatus = findTargetStatus($statusStore, issue.status, currentProject._id)
</script>

<div class="flex-row-center p-1" class:no-status={targetStatus === undefined}>
  <div class="p-1">
    <StatusRefPresenter value={issue.status} size={'small'} />
  </div>

  <div class="p-1 flex-row-center">
    <span class="p-1"> => </span>
    <!--Find appropriate status in target Project -->
    {#if targetStatus === undefined}
      <div class="flex-row-center">
        <Label label={tracker.string.NoStatusFound} />
        <span class="p-1"> => </span>
      </div>
    {/if}
    <StatusEditor
      iconSize={'small'}
      shouldShowLabel={true}
      value={{
        ...issueToAttachedData(issue),
        status: issueToUpdate.get(issue._id)?.status ?? currentProject.defaultIssueStatus,
        space: currentProject._id
      }}
      on:change={(evt) => issueToUpdate.set(issue._id, { ...issueToUpdate.get(issue._id), status: evt.detail })}
    />
  </div>
</div>

<style lang="scss">
  .no-status {
    background-color: var(--accent-bg-color);
  }
</style>
