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
  import { onDestroy } from 'svelte'

  import type { Asset, IntlString } from '@anticrm/platform'
  import type { Ref, Space, Doc } from '@anticrm/core'
  import type { SpacesNavModel } from '@anticrm/workbench'
  import { Action, navigate, getCurrentLocation, location, IconAdd, IconMoreH, IconEdit } from '@anticrm/ui'

  import { getClient, createQuery } from '@anticrm/presentation'
  import { showPopup } from '@anticrm/ui'

  import { classIcon } from '../../utils'

  import TreeNode from './TreeNode.svelte'
  import TreeItem from './TreeItem.svelte'

  import EditStatuses from '../EditStatuses.svelte'
  import SpacePanel from './SpacePanel.svelte'

  export let model: SpacesNavModel
  
  const client = getClient()
  const query = createQuery()
  let spaces: Space[] = []
  let selected: Ref<Space> | undefined = undefined

  $: query.query(model.spaceClass, {}, result => { spaces = result })

  const addSpace: Action = {
    label: model.addSpaceLabel,
    icon: IconAdd,
    action: async (_id: Ref<Doc>, ev?: Event): Promise<void> => {
      showPopup(model.createComponent, {}, ev?.target as HTMLElement)
    }
  }

  const editStatuses: Action = {
    label: 'Edit Statuses' as IntlString,
    icon: IconMoreH,
    action: async (_id: Ref<Doc>): Promise<void> => {
      showPopup(EditStatuses, { _id, spaceClass: model.spaceClass }, 'right')
    }
  }

  const editSpace: Action = {
    label: 'Open' as IntlString,
    icon: IconEdit,
    action: async (_id: Ref<Doc>): Promise<void> => {
      showPopup(SpacePanel, { _id, spaceClass: model.spaceClass }, 'right')
    }
  }

  function selectSpace(id: Ref<Space>) {
    const loc = getCurrentLocation()
    loc.path[2] = id
    loc.path.length = 3
    navigate(loc)
  }

  onDestroy(location.subscribe(async (loc) => {
    selected = loc.path[2] as Ref<Space>
  }))
</script>

<div>
  <TreeNode label={model.label} actions={[addSpace]}>
    {#each spaces as space}
      <TreeItem _id={space._id} title={space.name} icon={classIcon(client, space._class)} selected={selected === space._id} actions={[editSpace, editStatuses]} on:click={() => { selectSpace(space._id) }}/>
    {/each}
  </TreeNode>
</div>
