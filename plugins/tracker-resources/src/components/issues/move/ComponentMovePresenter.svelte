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
  import { Component, Issue, Project } from '@hcengineering/tracker'
  import { Label } from '@hcengineering/ui'
  import tracker from '../../../plugin'
  import { issueToAttachedData } from '../../../utils'
  import ComponentEditor from '../../components/ComponentEditor.svelte'
  import ComponentPresenter from '../../components/ComponentPresenter.svelte'

  export let issue: Issue
  export let currentProject: Project
  export let issueToUpdate: Map<Ref<Issue>, DocumentUpdate<Issue>> = new Map()
  export let components: Component[]

  $: currentComponent = components.find((it) => it._id === issue.component)

  $: targetComponent = components.find((it) => it.space === currentProject._id && it.label === currentComponent?.label)
</script>

{#if currentComponent !== undefined}
  <div class="flex-row-center p-1" class:no-component={targetComponent === undefined}>
    <div class="p-1">
      <ComponentPresenter value={currentComponent} />
    </div>

    <div class="p-1 flex-row-center">
      <span class="p-1"> => </span>
      <!--Find appropriate status in target Project -->
      {#if targetComponent === undefined}
        <div class="flex-row-center">
          <div class="mr-2">
            <Label label={tracker.string.NoComponent} />
          </div>
          <span class="p-1"> => </span>
        </div>
      {/if}
      <ComponentEditor
        shouldShowLabel={true}
        space={currentProject._id}
        value={{
          ...issueToAttachedData(issue),
          component: issueToUpdate.get(issue._id)?.component || null,
          space: currentProject._id
        }}
        on:change={(evt) => issueToUpdate.set(issue._id, { ...issueToUpdate.get(issue._id), status: evt.detail })}
      />
    </div>
  </div>
{/if}

<style lang="scss">
  .no-component {
    background-color: var(--accent-bg-color);
  }
</style>
