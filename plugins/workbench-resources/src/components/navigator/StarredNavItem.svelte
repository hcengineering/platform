<!--
// Copyright © 2022, 2023 Hardcore Engineering Inc.
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
  import type { Doc, Ref, Space } from '@hcengineering/core'
  import core from '@hcengineering/core'
  import { getResource } from '@hcengineering/platform'
  import preference from '@hcengineering/preference'
  import { getClient } from '@hcengineering/presentation'
  import { Action, IconEdit } from '@hcengineering/ui'
  import {
    NavLink,
    TreeItem,
    getActions as getContributedActions,
    getSpacePresenter,
    classIcon
  } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { getSpaceName } from '../../utils'

  export let space: Space
  export let model: SpacesNavModel | undefined
  export let currentSpace: Ref<Space> | undefined
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let deselect: boolean = false
  export let isChanged: boolean = false
  export let forciblyСollapsed: boolean = false

  const client = getClient()

  const unStarSpace: Action = {
    label: preference.string.Unstar,
    icon: preference.icon.Star,
    action: async (_id: Ref<Doc>): Promise<void> => {
      const current = await client.findOne(preference.class.SpacePreference, { attachedTo: _id as Ref<Space> })
      if (current !== undefined) {
        await client.remove(current)
      }
    }
  }

  async function getActions (space: Space): Promise<Action[]> {
    const result = [unStarSpace]

    const extraActions = await getContributedActions(client, space, core.class.Space)
    for (const act of extraActions) {
      result.push({
        icon: act.icon ?? IconEdit,
        label: act.label,
        action: async (ctx: any, evt: Event) => {
          const impl = await getResource(act.action)
          await impl(space, evt, act.actionProps)
        }
      })
    }
    return result
  }
</script>

{#await getSpacePresenter(client, space._class) then presenter}
  {#if presenter && model}
    <svelte:component
      this={presenter}
      {space}
      {model}
      {currentSpace}
      {currentSpecial}
      {currentFragment}
      {getActions}
      {deselect}
      {forciblyСollapsed}
      type={'nested'}
    />
  {:else}
    {#await getSpaceName(client, space) then name}
      <NavLink space={space._id}>
        <TreeItem
          _id={space._id}
          title={name}
          icon={classIcon(client, space._class)}
          selected={currentSpace === space._id}
          actions={async () => await getActions(space)}
          bold={isChanged}
          {forciblyСollapsed}
        />
      </NavLink>
    {/await}
  {/if}
{/await}
