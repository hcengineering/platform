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
  import { Process, ProcessToDo, Step, UserResult } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ParamsEditor from './ParamsEditor.svelte'
  import { Label, Toggle } from '@hcengineering/ui'
  import ResultsEditor from './ResultsEditor.svelte'

  export let process: Process
  export let step: Step<ProcessToDo>

  let params = step.params

  const dispatch = createEventDispatcher()

  function changeParams (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      params = e.detail
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }

  function changeResults (e: CustomEvent<UserResult[]>): void {
    if (e.detail !== undefined) {
      step.results = e.detail
      dispatch('change', step)
    }
  }

  const keys = ['title', 'user', 'dueDate']
</script>

<ParamsEditor _class={plugin.class.ProcessToDo} {process} {keys} {params} on:change={changeParams} />
<div class="divider" />
<div class="grid">
  <div>
    <Label label={plugin.string.Rollback} />
  </div>
  <Toggle
    on={params.withRollback ?? true}
    on:change={(e) => {
      params.withRollback = e.detail
      step.params = params
      dispatch('change', step)
    }}
  />
</div>
<div class="divider" />
<ResultsEditor {process} result={step.results} on:change={changeResults} />

<style lang="scss">
  .divider {
    border-bottom: 1px solid var(--divider-color);
    margin: 1rem 0;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
