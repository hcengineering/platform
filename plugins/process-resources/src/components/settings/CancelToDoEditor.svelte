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
  import { Ref } from '@hcengineering/core'
  import { Process, ProcessToDo, Step } from '@hcengineering/process'
  import { Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ToDoContextSelector from '../contextEditors/ToDoContextSelector.svelte'

  export let process: Process
  export let step: Step<ProcessToDo>

  const dispatch = createEventDispatcher()

  const params = step.params
  let _id = params._id as Ref<ProcessToDo>

  function change (e: CustomEvent): void {
    if (e.detail !== undefined) {
      _id = e.detail
      params._id = _id
      step.params = params
      dispatch('change', step)
    }
  }
</script>

<div class="editor-grid">
  <Label label={plugin.string.ToDo} />
  <ToDoContextSelector readonly={false} {process} value={_id} on:change={change} />
</div>
