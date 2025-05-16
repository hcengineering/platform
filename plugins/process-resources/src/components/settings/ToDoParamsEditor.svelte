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
  import { Process } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import plugin from '../../plugin'
  import { createEventDispatcher } from 'svelte'
  import ToDoContextSelector from '../contextEditors/ToDoContextSelector.svelte'

  export let readonly: boolean
  export let process: Process
  export let params: Record<string, any>

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<string>): void {
    if (readonly || e.detail == null) return
    params._id = e.detail
    dispatch('change', params)
  }
</script>

<div class="grid">
  <Label label={plugin.string.ToDo} />
  <ToDoContextSelector {readonly} {process} value={params._id} on:change={change} />
</div>

<style lang="scss">
  .grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    grid-auto-rows: minmax(2rem, max-content);
    justify-content: start;
    align-items: center;
    row-gap: 0.25rem;
    column-gap: 1rem;
    margin: 0.25rem 2rem 0;
    width: calc(100% - 4rem);
    height: min-content;
  }
</style>
