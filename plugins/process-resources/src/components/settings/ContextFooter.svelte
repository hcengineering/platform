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
  import ProcessContextPresenter from '../contextEditors/ProcessContextPresenter.svelte'

  export let process: Process
  export let step: Step<Doc>

  $: currentContext = step.context ? process.context[step.context._id] : undefined

  $: currentResultContext = step.result ? process.context[step.result._id] : undefined
</script>

{#if currentContext}
  <div class="container">
    <ProcessContextPresenter context={currentContext} />
  </div>
{/if}

{#if currentResultContext}
  <div class="container">
    <ProcessContextPresenter context={currentResultContext} />
  </div>
{/if}

<style lang="scss">
  .container {
    padding: 0.5rem 1rem;
    background: #3575de33;
    padding-left: 0.75rem;
    border: 1px solid var(--primary-button-default);
    border-radius: 0.375rem;
    display: flex;
    align-items: center;
    color: var(--theme-caption-color);
  }
</style>
