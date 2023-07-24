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
  import { TreeItem, SelectableTreeNode } from '@hcengineering/view-resources'

  import hr from '../../plugin'

  export let departments: Ref<Department>[]
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>
  export let selected: Ref<Department> | undefined

  const dispatch = createEventDispatcher()

  function getDescendants (department: Ref<Department>): Ref<Department>[] {
    return (descendants.get(department) ?? []).map((p) => p._id)
  }

  function handleDepartmentSelected (department: Ref<Department>): void {
    dispatch('selected', department)
  }
</script>

{#each departments as dep}
  {@const department = departmentById.get(dep)}
  {@const desc = getDescendants(dep)}

  {#if department}
    {#if desc.length}
      <SelectableTreeNode
        icon={hr.icon.Department}
        title={department.name}
        selected={selected === department._id}
        indent={'auto'}
        on:click={() => handleDepartmentSelected(department._id)}
      >
        <svelte:self departments={desc} {descendants} {departmentById} {selected} on:selected />
      </SelectableTreeNode>
    {:else}
      <TreeItem
        _id={department._id}
        icon={hr.icon.Department}
        title={department.name}
        selected={selected === department._id}
        on:click={() => handleDepartmentSelected(department._id)}
      />
    {/if}
  {/if}
{/each}
