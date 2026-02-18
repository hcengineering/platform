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
  import { Process } from '@hcengineering/process'
  import { DropdownLabels, Label } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { ModeId } from '../../query'
  import SubProcessStateCriteria from '../criterias/SubProcessStateCriteria.svelte'

  export let readonly: boolean
  export let process: Process
  export let params: Record<string, any>

  const dispatch = createEventDispatcher()
  const client = getClient()

  $: possibleProcesses = getPossibleProcesses(process)

  function getPossibleProcesses (proc: Process): Ref<Process>[] {
    const res = new Set<Ref<Process>>()
    const transitions = client.getModel().findAllSync(plugin.class.Transition, { process: proc._id })
    for (const transition of transitions) {
      for (const action of transition.actions ?? []) {
        if (action.methodId === plugin.method.RunSubProcess) {
          if (action.params._id) {
            res.add(action.params._id as Ref<Process>)
          }
        }
      }
    }
    return [...res]
  }

  $: processes = client.getModel().findAllSync(plugin.class.Process, { _id: { $in: possibleProcesses } })

  $: items = processes.map((it) => ({
    id: it._id,
    label: it.name
  }))

  let selectedProcessId: Ref<Process> | undefined = params.process
  $: selectedProcessId = params.process

  $: selected = selectedProcessId !== undefined ? items.find((it) => it.id === selectedProcessId)?.id : undefined

  function changeProcess (e: CustomEvent<any>): void {
    if (readonly || e.detail == null) return
    selectedProcessId = e.detail
    params = {
      process: selectedProcessId
    }
    dispatch('change', { params })
  }

  function changeStateCriteria (e: CustomEvent<any>): void {
    if (readonly || e.detail == null) return
    params = {
      ...params,
      currentState: e.detail
    }
    dispatch('change', { params })
  }

  const modes: ModeId[] = ['ArrayAll', 'ArrayAny', 'ArrayNotIncludes']
</script>

<div class="editor-grid">
  <Label label={plugin.string.Process} />
  <DropdownLabels
    disabled={readonly}
    autoSelect={false}
    enableSearch={false}
    width={'100%'}
    {items}
    {selected}
    placeholder={plugin.string.Process}
    on:selected={changeProcess}
  />

  {#if selectedProcessId !== undefined}
    <Label label={plugin.string.Step} />
    <SubProcessStateCriteria
      {readonly}
      target={selectedProcessId}
      value={params.currentState}
      on:change={changeStateCriteria}
    />
  {/if}
</div>
