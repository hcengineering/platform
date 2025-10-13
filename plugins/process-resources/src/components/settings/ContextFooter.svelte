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
  import { Doc } from '@hcengineering/core'
  import { Process, Step } from '@hcengineering/process'
  import { Label, Scroller } from '@hcengineering/ui'
  import processPlugin from '../../plugin'
  import ProcessContextPresenter from '../contextEditors/ProcessContextPresenter.svelte'
  import { ProcessContextView } from '../../types'

  export let process: Process
  export let step: Step<Doc>

  $: currentContext = step.context ? process.context[step.context._id] : undefined

  let resultContext: ProcessContextView[] = []
  $: resultContext =
    step.results != null
      ? step.results.map((r) => {
        const exists = process.context[r._id]
        if (exists != null) return exists
        return {
          name: r.name,
          _class: r.type._class
        }
      })
      : []
</script>

{#if currentContext || resultContext.length > 0}
  <Scroller horizontal>
    <div class="flex-row-center flex-gap-2">
      <Label label={processPlugin.string.Result} />:
      {#if currentContext}
        <div class="container">
          <ProcessContextPresenter context={currentContext} />
        </div>
      {/if}
      {#each resultContext as ctx}
        <div class="container">
          <ProcessContextPresenter context={ctx} />
        </div>
      {/each}
    </div>
  </Scroller>
{/if}

<style lang="scss">
  .container {
    padding: 0.25rem 0.5rem;
    background: #3575de33;
    border: 1px solid var(--primary-button-default);
    border-radius: 0.25rem;
    display: flex;
    align-items: center;
    color: var(--theme-caption-color);
  }
</style>
