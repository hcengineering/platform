<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { getClient } from '@hcengineering/presentation'
  import plugin from '../plugin'
  import { Execution, ExecutionStatus } from '@hcengineering/process'
  import TransitionPresenter from './settings/TransitionPresenter.svelte'
  import TriggerPresenter from './settings/TriggerPresenter.svelte'
  import { Label } from '@hcengineering/ui'

  export let execution: Execution

  const client = getClient()
  const model = client.getModel()

  $: transitions = model.findAllSync(plugin.class.Transition, {
    process: execution.process,
    from: execution.currentState
  })

  $: process = model.findObject(execution.process)
</script>

{#if execution.status === ExecutionStatus.Done}
  <Label label={plugin.string.Done} />
{:else if execution.status === ExecutionStatus.Cancelled}
  <Label label={plugin.string.Cancelled} />
{:else if process !== undefined}
  <div class="flex-col flex-gap-2">
    {#each transitions as transition}
      <div class="flex-row-center flex-gap-2">
        <TransitionPresenter {transition} direction={'from'} />
        <TriggerPresenter value={transition.trigger} {process} params={transition.triggerParams} withLabel={true} />
      </div>
    {/each}
  </div>
{/if}
