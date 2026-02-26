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
  import { parseContext, Process, SelectedContext, SelectedExecutionContext } from '@hcengineering/process'
  import ui, { Label } from '@hcengineering/ui'
  import ExecutionContextPresenter from '../attributeEditors/ExecutionContextPresenter.svelte'

  export let process: Process
  export let params: Record<string, any>

  $: context = getContext(params._id)

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

{#if context === undefined}
  <Label label={ui.string.NotSelected} />
{:else}
  <ExecutionContextPresenter {process} contextValue={context} />
{/if}
