<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import { Ref, Space } from '@hcengineering/core'
  import { Project } from '@hcengineering/tracker'
  import { NavLink } from '@hcengineering/ui'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { SpecialElement } from '@hcengineering/workbench-resources'
  import { TreeNode } from '@hcengineering/view-resources'

  export let space: Project
  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let getActions: Function
  export let deselect: boolean = false
</script>

{#if model.specials}
  <TreeNode icon={space?.icon ?? model.icon} title={space.name} indent={'ml-2'} actions={() => getActions(space)}>
    {#each model.specials as special}
      <NavLink space={space._id} special={special.id}>
        <SpecialElement
          indent={'ml-4'}
          label={special.label}
          icon={special.icon}
          selected={deselect ? false : currentSpace === space._id && special.id === currentSpecial}
        />
      </NavLink>
    {/each}
  </TreeNode>
{/if}
