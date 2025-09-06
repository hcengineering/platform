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
  import { Process, TriggerResult } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ToDoContextSelector from '../contextEditors/ToDoContextSelector.svelte'
  import ResultEditor from './ResultEditor.svelte'

  export let readonly: boolean
  export let process: Process
  export let params: Record<string, any>
  export let skipRollback: boolean = false
  export let result: TriggerResult | null = null

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<string>): void {
    if (readonly || e.detail == null) return
    params._id = e.detail
    dispatch('change', { params })
  }

  function changeResult (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      result = e.detail
      dispatch('change', { result })
    }
  }
</script>

<div class="grid">
  <Label label={plugin.string.ToDo} />
  <ToDoContextSelector {readonly} {skipRollback} {process} value={params._id} on:change={change} />
</div>
{#if !skipRollback}
  <div class="divider" />
  <ResultEditor {result} on:change={changeResult} />
{/if}

<style lang="scss">
  .divider {
    border-bottom: 1px solid var(--divider-color);
    margin: 1rem 0;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr 3fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.5rem;
    column-gap: 1rem;
    margin-top: 0.5rem;
    height: min-content;
  }
</style>
