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
  import { SortingOrder } from '@anticrm/core'
  import type { Doc, Ref, Space } from '@anticrm/core'
  import core from '@anticrm/core'
  import { getResource, IntlString } from '@anticrm/platform'
  import { createQuery, getClient } from '@anticrm/presentation'
  import { Action, getCurrentLocation, IconAdd, IconEdit, location, navigate, showPopup } from '@anticrm/ui'
  import { getActions as getContributedActions } from '@anticrm/view-resources'
  import type { SpacesNavModel } from '@anticrm/workbench'
  import { onDestroy } from 'svelte'
  import { classIcon } from '../../utils'
  import SpacePanel from './SpacePanel.svelte'
  import TreeItem from './TreeItem.svelte'
  import TreeNode from './TreeNode.svelte'

  export let model: SpacesNavModel
  
  const client = getClient()
  const query = createQuery()
  let spaces: Space[] = []
  let selected: Ref<Space> | undefined = undefined

  $: query.query(model.spaceClass, { archived: false }, result => { spaces = result }, { sort: { name: SortingOrder.Ascending }})

  const addSpace: Action = {
    label: model.addSpaceLabel,
    icon: IconAdd,
    action: async (_id: Ref<Doc>, ev?: Event): Promise<void> => {
      showPopup(model.createComponent, {}, ev?.target as HTMLElement)
    }
  }

  const editSpace: Action = {
    label: 'Open' as IntlString,
    icon: IconEdit,
    action: async (_id: Ref<Doc>): Promise<void> => {
      showPopup(model.component ?? SpacePanel, { _id, spaceClass: model.spaceClass }, 'right')
    }
  }


  function selectSpace (id: Ref<Space>) {
    const loc = getCurrentLocation()
    loc.path[2] = id
    loc.path.length = 3
    navigate(loc)
  }

  onDestroy(location.subscribe(async (loc) => {
    selected = loc.path[2] as Ref<Space>
  }))

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
  <TreeNode label={model.label} actions={[addSpace]}>
    {#each spaces as space}
      {#await getActions(space) then actions}
        <TreeItem _id={space._id} title={space.name} icon={classIcon(client, space._class)} selected={selected === space._id} {actions} on:click={() => { selectSpace(space._id) }}/>
      {/await}
    {/each}
  </TreeNode>
</div>
