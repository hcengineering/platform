<!--
// Copyright © 2020 Anticrm Platform Contributors.
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
  import type { Doc, Ref, Space } from '@hcengineering/core'
  import core from '@hcengineering/core'
  import { DocUpdates } from '@hcengineering/notification'
  import { NotificationClientImpl } from '@hcengineering/notification-resources'
  import { IntlString, getResource } from '@hcengineering/platform'
  import preference from '@hcengineering/preference'
  import { getClient } from '@hcengineering/presentation'
  import {
    Action,
    AnyComponent,
    IconAdd,
    IconEdit,
    IconSearch,
    getCurrentResolvedLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import { NavLink, TreeItem, TreeNode, getActions as getContributedActions } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { createEventDispatcher } from 'svelte'
  import plugin from '../../plugin'
  import { classIcon, getSpaceName, getSpacePresenter } from '../../utils'
  import TreeSeparator from './TreeSeparator.svelte'

  export let model: SpacesNavModel
  export let currentSpace: Ref<Space> | undefined
  export let spaces: Space[]
  export let currentSpecial: string | undefined
  export let currentFragment: string | undefined
  export let hasSpaceBrowser: boolean = false
  export let deselect: boolean = false
  export let separate: boolean = false

  const client = getClient()
  const dispatch = createEventDispatcher()

  const addSpace = (addSpaceLabel: IntlString, createComponent: AnyComponent): Action => ({
    label: addSpaceLabel,
    icon: IconAdd,
    action: async (_id: Ref<Doc>): Promise<void> => {
      dispatch('open')
      showPopup(createComponent, {}, 'top')
    }
  })

  const browseSpaces: Action = {
    label: plugin.string.BrowseSpaces,
    icon: IconSearch,
    action: async (_id: Ref<Doc>): Promise<void> => {
      const loc = getCurrentResolvedLocation()
      loc.path[3] = 'spaceBrowser'
      loc.path.length = 4
      dispatch('open')
      navigate(loc)
    }
  }

  const starSpace: Action = {
    label: preference.string.Star,
    icon: preference.icon.Star,
    action: async (_id: Ref<Space>): Promise<void> => {
      await client.createDoc(preference.class.SpacePreference, preference.space.Preference, {
        attachedTo: _id
      })
    }
  }

  async function getActions (space: Space): Promise<Action[]> {
    const result = [starSpace]

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

  const notificationClient = NotificationClientImpl.getClient()
  const docUpdates = notificationClient.docUpdatesStore

  function isChanged (space: Space, docUpdates: Map<Ref<Doc>, DocUpdates>): boolean {
    const update = docUpdates.get(space._id)
    if (update === undefined) return false
    return update.txes.filter((tx) => tx.isNew).length > 0 && update.hidden !== true
  }

  function getParentActions (): Action[] {
    const result = hasSpaceBrowser ? [browseSpaces] : []
    if (model.addSpaceLabel !== undefined && model.createComponent !== undefined) {
      result.push(addSpace(model.addSpaceLabel, model.createComponent))
    }
    return result
  }

  let visibleIf: ((space: Space) => Promise<boolean>) | undefined

  $: if (model.visibleIf) {
    getResource(model.visibleIf).then((r) => {
      visibleIf = r
    })
  }

  let filteredSpaces: Space[] = []

  async function updateSpaces (spaces: Space[], visibleIf: (space: Space) => Promise<boolean>): Promise<void> {
    const result: Space[] = []
    for (const s of spaces) {
      if (await visibleIf(s)) {
        result.push(s)
      }
    }
    filteredSpaces = result
  }

  $: if (visibleIf) {
    updateSpaces(spaces, visibleIf)
  } else {
    filteredSpaces = spaces
  }
</script>

<TreeNode
  label={model.label}
  parent
  actions={async () => getParentActions()}
  shortDropbox={model.specials !== undefined}
>
  {#each filteredSpaces as space, i (space._id)}
    {#await getSpacePresenter(client, space._class) then presenter}
      {#if separate && model.specials && i !== 0}<TreeSeparator line />{/if}
      {#if model.specials && presenter}
        <svelte:component
          this={presenter}
          {space}
          {model}
          {currentSpace}
          {currentSpecial}
          {currentFragment}
          {getActions}
          {deselect}
        />
      {:else}
        <NavLink space={space._id}>
          {#await getSpaceName(client, space) then name}
            <TreeItem
              indent={'ml-2'}
              _id={space._id}
              title={name}
              icon={classIcon(client, space._class)}
              selected={deselect ? false : currentSpace === space._id}
              actions={() => getActions(space)}
              bold={isChanged(space, $docUpdates)}
            />
          {/await}
        </NavLink>
      {/if}
    {/await}
  {/each}
</TreeNode>
