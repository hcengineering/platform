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
  import { Ref } from '@hcengineering/core'
  import { Department } from '@hcengineering/hr'
  import { Label, Scroller, resolvedLocationStore } from '@hcengineering/ui'
  import { TreeNode } from '@hcengineering/view-resources'

  import hr from '../../plugin'

  import DepartmentsHierarchy from './DepartmentsHierarchy.svelte'

  export let department: Ref<Department>
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>

  const departments = [hr.ids.Head]
</script>

<div class="antiPanel-navigator filledNav indent">
  <div class="antiNav-header">
    <span class="top overflow-label">
      <Label label={hr.string.HRApplication} />
    </span>
    <span class="bottom overflow-label">
      {$resolvedLocationStore.path[1]}
    </span>
  </div>

  <Scroller shrink>
    <!-- TODO Specials -->

    <div class="antiNav-divider short line" />

    <TreeNode label={hr.string.Departments} parent>
      <DepartmentsHierarchy {departments} {descendants} {departmentById} selected={department} on:selected />
    </TreeNode>

    <div class="antiNav-divider short line" />

    <TreeNode label={hr.string.Positions} parent>
      <!-- TODO Positions -->
    </TreeNode>

    <div class="antiNav-divider short line" />
  </Scroller>
</div>
