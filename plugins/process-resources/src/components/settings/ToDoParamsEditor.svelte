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
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ToDoContextSelector from '../contextEditors/ToDoContextSelector.svelte'

  export let readonly: boolean
  export let process: Process
  export let params: Record<string, any>
  export let skipRollback: boolean = false

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<string>): void {
    if (readonly || e.detail == null) return
    params._id = e.detail
    dispatch('change', { params })
  }
</script>

<div class="editor-grid">
  <Label label={plugin.string.ToDo} />
  <ToDoContextSelector {readonly} {skipRollback} {process} value={params._id} on:change={change} />
</div>
