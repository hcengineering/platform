<!--
// Copyright © 2023 Hardcore Engineering Inc.
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
  import { createEventDispatcher } from 'svelte'
  import { Ref } from '@hcengineering/core'
  import { Department } from '@hcengineering/hr'
  import { getResource } from '@hcengineering/platform'
  import { getClient } from '@hcengineering/presentation'
  import { Action, IconEdit } from '@hcengineering/ui'
  import { getActions as getContributedActions } from '@hcengineering/view-resources'

  import hr from '../../plugin'

  import TreeElement from './TreeElement.svelte'

  export let departments: Ref<Department>[]
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>
  export let selected: Ref<Department> | undefined
  export let level = 0

  const client = getClient()
  const dispatch = createEventDispatcher()

  function getDescendants (department: Ref<Department>): Ref<Department>[] {
    return (descendants.get(department) ?? []).sort((a, b) => a.name.localeCompare(b.name)).map((p) => p._id)
  }

  async function getActions (obj: Department): Promise<Action[]> {
    const result: Action[] = []
    const extraActions = await getContributedActions(client, obj, obj._class)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(obj, evt, act.actionProps)
        }
      })
    }
    return result
  }

  function handleDepartmentSelected (department: Ref<Department>): void {
    dispatch('selected', department)
  }

  $: _departments = departments.map((it) => departmentById.get(it)).filter((it) => it !== undefined) as Department[]
  $: _descendants = new Map(_departments.map((it) => [it._id, getDescendants(it._id)]))
</script>

{#each _departments as department}
  {@const desc = _descendants.get(department._id) ?? []}

  {#if department}
    <TreeElement
      _id={department._id}
      icon={hr.icon.Department}
      title={department.name}
      selected={selected === department._id}
      node={desc.length > 0}
      actions={() => getActions(department)}
      {level}
      on:click={() => handleDepartmentSelected(department._id)}
    >
      {#if desc.length}
        <svelte:self departments={desc} {descendants} {departmentById} {selected} level={level + 1} on:selected />
      {/if}
    </TreeElement>
  {/if}
{/each}
