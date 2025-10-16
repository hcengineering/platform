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
  import { Ref, SortingOrder } from '@hcengineering/core'
  import { Process, State } from '@hcengineering/process'
  import { Dropdown, DropdownLabels } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { buildResult, Modes, parseValue } from '../../query'
  import ModeSelector from './ModeSelector.svelte'
  import { ObjectBox } from '@hcengineering/view-resources'
  import { createQuery } from '@hcengineering/presentation'

  export let readonly: boolean
  export let target: Ref<Process> | undefined
  export let value: any

  const dispatch = createEventDispatcher()

  const modes = [Modes.ArrayAll, Modes.ArrayAny, Modes.ArrayNotIncludes]

  let [val, selectedMode] = parseValue(modes, value)
  $: [val, selectedMode] = parseValue(modes, value)

  function changeMode (): void {
    value = buildResult(selectedMode, val)
    dispatch('change', value)
  }

  function change (e: CustomEvent): void {
    val = e.detail ?? []
    value = buildResult(selectedMode, val)
    dispatch('change', value)
  }

  const query = createQuery()
  let states: State[] = []
  $: query.query(
    plugin.class.State,
    { process: target },
    (items) => {
      states = items
    },
    { sort: { rank: SortingOrder.Ascending } }
  )

  $: selected = states.filter((state) => val?.includes(state._id))?.map((p) => p._id)
</script>

<div class="flex-row-center flex-gap-4">
  <ModeSelector bind:selectedMode {modes} {readonly} on:change={changeMode} />
  <DropdownLabels
    useFlexGrow
    width={'100%'}
    multiselect={true}
    items={states.map((state) => ({ id: state._id, label: state.title }))}
    {selected}
    on:selected={change}
  />
</div>
