<!--
// Copyright © 2026 Hardcore Engineering Inc.
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
  import {
    Process,
    ProcessToDo,
    SelectedContext,
    SelectedExecutionContext,
    Step,
    parseContext
  } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import ExecutionContextPresenter from '../attributeEditors/ExecutionContextPresenter.svelte'

  export let step: Step<ProcessToDo>
  export let process: Process

  const client = getClient()
  $: method = client.getModel().findAllSync(plugin.class.Method, { _id: step.methodId })[0]

  $: context = getContext(step.params._id as string)

  function getContext (value: string | undefined): SelectedExecutionContext | undefined {
    if (value === undefined) return
    const context = parseContext(value)
    if (context !== undefined && isExecutionContext(context)) {
      return context
    }
  }

  function isExecutionContext (context: SelectedContext): context is SelectedExecutionContext {
    return context.type === 'context'
  }
</script>

<div class="flex-row-center flex-gap-2">
  <Label label={method.label} />
  {#if context}
    :
    <div class="title">
      <ExecutionContextPresenter {process} contextValue={context} />
    </div>
  {/if}
</div>

<style lang="scss">
  .title {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--theme-caption-color);
  }
</style>
