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
  import { Team } from '@hcengineering/tracker'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { TreeNode, SpecialElement } from '@hcengineering/workbench-resources'
  import { createEventDispatcher } from 'svelte'

  export let space: Team
  export let model: SpacesNavModel
  export let selectSpace: Function
  export let getActions: Function

  const dispatch = createEventDispatcher()
</script>

{#if model.specials}
  <TreeNode icon={model.icon} title={space.name} indent={'ml-2'} actions={() => getActions(space)}>
    {#each model.specials as special}
      <SpecialElement
        indent={'ml-4'}
        label={special.label}
        icon={special.icon}
        on:click={() => dispatch('special', special.id)}
        selected={false}
        on:click={() => {
          selectSpace(space._id, special.id)
        }}
      />
    {/each}
  </TreeNode>
{/if}
