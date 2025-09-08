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
  import { Ref } from '@hcengineering/core'
  import { getClient } from '@hcengineering/presentation'
  import { ExecutionContext, parseContext, Process, SelectedUserRequest, Transition } from '@hcengineering/process'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import ProcessAttributeEditor from './ProcessAttributeEditor.svelte'

  export let process: Process
  export let targetProcess: Ref<Process>
  export let context: ExecutionContext

  const client = getClient()
  const dispatch = createEventDispatcher()

  $: initTransition = client.getModel().findAllSync(plugin.class.Transition, {
    process: targetProcess,
    from: null
  })[0]

  let contexts: SelectedUserRequest[] = []

  function fillParams (initTransition: Transition | undefined): void {
    contexts = []
    for (const action of initTransition?.actions ?? []) {
      for (const key in action.params) {
        const value = (action.params as any)[key]
        const request = parseContext(value)
        if (request !== undefined && request.type === 'userRequest') {
          contexts.push(request)
        }
      }
    }
    contexts = contexts
  }

  $: fillParams(initTransition)
</script>

{#each contexts as ctx}
  <ProcessAttributeEditor
    {process}
    _class={ctx._class}
    key={ctx.key}
    objectKey={ctx.id}
    object={context}
    allowRemove
    on:change={(e) => {
      context = e.detail.object
      dispatch('change', context)
    }}
  />
{/each}
