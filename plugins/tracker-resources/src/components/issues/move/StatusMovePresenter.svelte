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
  import { Ref } from '@hcengineering/core'
  import { Issue, Project } from '@hcengineering/tracker'
  import { IssueToUpdate, issueToAttachedData } from '../../../utils'
  import StatusEditor from '../StatusEditor.svelte'
  import StatusRefPresenter from '../StatusRefPresenter.svelte'

  export let issue: Issue
  export let currentProject: Project
  export let issueToUpdate: Map<Ref<Issue>, IssueToUpdate> = new Map()
</script>

<div class="flex-row-center p-1">
  <div class="side-columns aligned-text">
    <StatusRefPresenter value={issue.status} size={'small'} />
  </div>
  <span class="middle-column aligned-text">-></span>
  <div class="side-columns">
    <StatusEditor
      shouldShowLabel
      kind={'secondary'}
      width={'min-content'}
      iconSize={'small'}
      value={{
        ...issueToAttachedData(issue),
        status: issueToUpdate.get(issue._id)?.status ?? currentProject.defaultIssueStatus,
        space: currentProject._id
      }}
      on:change={(e) =>
        issueToUpdate.set(issue._id, { ...issueToUpdate.get(issue._id), status: e.detail, useStatus: true })}
    />
  </div>
</div>

<style lang="scss">
  .side-columns {
    width: 45%;
  }
  .middle-column {
    width: 10%;
  }
  .aligned-text {
    display: flex;
    align-items: center;
  }
</style>
