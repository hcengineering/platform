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
  import { Issue, IssueStatus, Project } from '@hcengineering/tracker'
  import { Button, Grid, IconArrowRight, eventToHTMLElement, showPopup } from '@hcengineering/ui'

  import { IssueToUpdate } from '../../../utils'
  import StatusRefPresenter from '../StatusRefPresenter.svelte'
  import StatusReplacementPopup from './StatusReplacementPopup.svelte'
  import { statusStore } from '@hcengineering/view-resources'

  export let issue: Issue
  export let targetProject: Project
  export let currentProject: Ref<Project>
  export let issueToUpdate: Map<Ref<Issue>, IssueToUpdate> = new Map()
  export let statuses: IssueStatus[]

  $: replace = issueToUpdate.get(issue._id)?.status ?? targetProject.defaultIssueStatus
  $: original = $statusStore.get(issue.status)
</script>

<Grid rowGap={0.25} topGap>
  <div class="flex-between min-h-11">
    <StatusRefPresenter space={currentProject} value={issue.status} size={'small'} />
    <IconArrowRight size={'small'} fill={'var(--theme-halfcontent-color)'} />
  </div>
  <div class="flex-row-center min-h-11">
    <Button
      size={'large'}
      shape={'round-sm'}
      width={'min-content'}
      on:click={(event) => {
        showPopup(
          StatusReplacementPopup,
          { statuses, original, selected: replace },
          eventToHTMLElement(event),
          (value) => {
            if (value) {
              const createStatus = typeof value === 'object'
              const s = createStatus ? value.create : value
              issueToUpdate.set(issue._id, {
                ...issueToUpdate.get(issue._id),
                status: s,
                useStatus: true,
                createStatus
              })
            }
          }
        )
      }}
    >
      <span slot="content" class="flex-row-center pointer-events-none">
        <StatusRefPresenter space={targetProject._id} value={replace} />
      </span>
    </Button>
  </div>
</Grid>
