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
  import { Component, Issue, Project } from '@hcengineering/tracker'
  import { IssueToUpdate, issueToAttachedData } from '../../../utils'
  import ComponentEditor from '../../components/ComponentEditor.svelte'
  import ComponentPresenter from '../../components/ComponentPresenter.svelte'

  export let issue: Issue
  export let currentProject: Project
  export let issueToUpdate: Map<Ref<Issue>, IssueToUpdate> = new Map()
  export let components: Component[]

  $: currentComponent = components.find((it) => it._id === issue.component)
</script>

{#if currentComponent !== undefined}
  <div class="flex-row-center p-1">
    <div class="side-columns aligned-text">
      <ComponentPresenter value={currentComponent} disabled />
    </div>
    <span class="middle-column aligned-text">-></span>
    <div class="side-columns">
      <ComponentEditor
        shouldShowLabel
        kind={'secondary'}
        width={'min-content'}
        space={currentProject._id}
        value={{
          ...issueToAttachedData(issue),
          component: issueToUpdate.get(issue._id)?.component || null,
          space: currentProject._id
        }}
        on:change={(e) =>
          issueToUpdate.set(issue._id, { ...issueToUpdate.get(issue._id), component: e.detail, useComponent: true })}
      />
    </div>
  </div>
{/if}

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
