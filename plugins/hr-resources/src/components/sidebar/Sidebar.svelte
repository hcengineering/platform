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
  import { Scroller, Separator } from '@hcengineering/ui'
  import { TreeNode } from '@hcengineering/view-resources'
  import { NavFooter, NavHeader } from '@hcengineering/workbench-resources'

  import hr from '../../plugin'

  import DepartmentsHierarchy from './DepartmentsHierarchy.svelte'

  export let department: Ref<Department>
  export let descendants: Map<Ref<Department>, Department[]>
  export let departmentById: Map<Ref<Department>, Department>
  export let navFloat: boolean = false
  export let appsDirection: 'horizontal' | 'vertical' = 'horizontal'

  const departments = [hr.ids.Head]
</script>

<div class="antiPanel-navigator {appsDirection === 'horizontal' ? 'portrait' : 'landscape'} border-left">
  <div class="antiPanel-wrap__content hulyNavPanel-container">
    <NavHeader label={hr.string.HRApplication} />

    <Scroller shrink>
      <TreeNode
        _id={'tree-hr'}
        label={hr.string.Departments}
        highlighted={department !== undefined}
        isFold={department !== undefined}
        noDivider
      >
        <DepartmentsHierarchy {departments} {descendants} {departmentById} selected={department} on:selected />
      </TreeNode>
    </Scroller>

    <NavFooter />
  </div>
  <Separator
    name={'workbench'}
    float={navFloat ? 'navigator' : true}
    index={0}
    color={'var(--theme-navpanel-border)'}
  />
</div>
