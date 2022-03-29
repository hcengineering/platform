<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Doc, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getResource } from '@anticrm/platform'
  import { getClient } from '@anticrm/presentation'
  import { Team } from '@anticrm/spuristo'
  import { Action, IconEdit } from '@anticrm/ui'
  import { getActions as getContributedActions } from '@anticrm/view-resources'
  import { createEventDispatcher } from 'svelte'
  import spuristo from '../../plugin'
  import { NavigationItem, Selection } from '../../utils'
  import TreeItem from './TreeItem.svelte'
  import TreeNode from './TreeNode.svelte'

  export let selection: Selection
  
  export let spaces: Team[]
  export let teamItems: NavigationItem[]
  const client = getClient()
  const dispatch = createEventDispatcher()

  // const addTeam: Action = {
  //   label: spuristo.string.CreateTeam,
  //   icon: IconAdd,
  //   action: async (_id: Ref<Doc>, ev?: Event): Promise<void> => {
  //     // showPopup(model.createComponent, {}, ev?.target as HTMLElement)
  //   }
  // }

  const editSpace: Action = {
    label: spuristo.string.Open,
    icon: IconEdit,
    action: async (_id: Ref<Doc>): Promise<void> => {
      // const editor = await getEditor(model.spaceClass)
      // showPanel(editor ?? plugin.component.SpacePanel, _id, model.spaceClass, 'right')
    }
  }
  
  function selectSpace (special: string, teamId: Ref<Team>) {
    dispatch('selection', { currentSpecial: special, currentTeam: teamId } as Selection)
  }

  async function getActions (space: Space): Promise<Action[]> {
    const result = [editSpace]

    const extraActions = await getContributedActions(client, space, core.class.Space)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async () => {
          const impl = await getResource(act.action)
          await impl(space)
        }
      })
    }
    return result
  }
</script>

<div>
  {#each spaces as space}
    <TreeNode title={space.name}>
      {#each teamItems as special}
        <TreeItem
          _id={space._id + special.id}
          label={special.label}
          icon={special.icon}
          selected={selection.currentTeam === space._id && selection.currentSpecial === special.id}
          actions={() => getActions(space)}
          on:click={() => {
            selectSpace(special.id, space._id)
          }}
        />
      {/each}
      </TreeNode>
  {/each}
</div>
