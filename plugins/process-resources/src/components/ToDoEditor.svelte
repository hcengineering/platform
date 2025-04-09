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
  import { Process, ProcessToDo, State, Step } from '@hcengineering/process'
  import { createEventDispatcher, onMount } from 'svelte'
  import ParamsEditor from './ParamsEditor.svelte'
  import plugin from '../plugin'

  export let process: Process
  export let state: State
  export let step: Step<ProcessToDo>

  let params = step.params

  const dispatch = createEventDispatcher()

  function change (e: CustomEvent<any>): void {
    if (e.detail !== undefined) {
      params = e.detail
      ;(step.params as any) = params
      dispatch('change', step)
    }
  }

  const keys = test()

  function test (): Array<keyof ProcessToDo> {
    return ['title', 'user', 'dueDate']
  }
</script>

<ParamsEditor _class={plugin.class.ProcessToDo} {process} {state} {keys} {params} on:change={change} />
