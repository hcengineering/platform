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
  import core, { Doc, Ref, Space, AccountRole, getCurrentAccount, hasAccountRole } from '@hcengineering/core'
  import { IntlString, getResource } from '@hcengineering/platform'
  import preference from '@hcengineering/preference'
  import { getClient } from '@hcengineering/presentation'
  import {
    Action,
    AnyComponent,
    Component,
    IconAdd,
    IconSearch,
    getCurrentResolvedLocation,
    navigate,
    showPopup
  } from '@hcengineering/ui'
  import { TreeNode } from '@hcengineering/view-resources'
  import { SpacesNavModel } from '@hcengineering/workbench'
  import { createEventDispatcher } from 'svelte'
  import { InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { DocNotifyContext, InboxNotification } from '@hcengineering/notification'

  import plugin from '../../plugin'
  import TreeSeparator from './TreeSeparator.svelte'
  import SpacesNavItem from './SpacesNavItem.svelte'

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
      await client.createDoc(preference.class.SpacePreference, core.space.Workspace, {
        attachedTo: _id
      })
    }
  }

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notifyContextByDocStore = inboxClient.contextByDoc
  const inboxNotificationsByContextStore = inboxClient.inboxNotificationsByContext

  function isChanged (
    space: Space,
    notifyContextByDoc: Map<Ref<Doc>, DocNotifyContext>,
    inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
  ): boolean {
    const context = notifyContextByDoc.get(space._id)

    if (context === undefined) {
      return false
    }

    const inboxNotifications = inboxNotificationsByContext.get(context._id) ?? []

    return inboxNotifications.filter(({ isViewed }) => !isViewed).length > 0
  }

  function getParentActions (): Action[] {
    const result = hasSpaceBrowser ? [browseSpaces] : []
    if (
      hasAccountRole(getCurrentAccount(), AccountRole.User) &&
      model.addSpaceLabel !== undefined &&
      model.createComponent !== undefined
    ) {
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
  $: visibleSpace = filteredSpaces.find((fs) => fs._id === currentSpace)
  $: empty = filteredSpaces.length === 0 || filteredSpaces === undefined
  $: visible =
    visibleSpace !== undefined &&
    (currentSpecial !== undefined || currentFragment !== undefined || currentFragment !== '') &&
    !deselect &&
    !empty
</script>

{#if model?.spacePresenter === undefined}
  <TreeNode
    _id={'tree-' + model.id}
    label={model.label}
    actions={async () => getParentActions()}
    highlighted={visible}
    isFold={!empty}
    {empty}
    {visible}
  >
    {#each filteredSpaces as space, i (space._id)}
      {#if separate && model.specials && i !== 0}<TreeSeparator line />{/if}
      <SpacesNavItem
        {model}
        {space}
        {currentSpace}
        {currentSpecial}
        {currentFragment}
        {deselect}
        isChanged={isChanged(space, $notifyContextByDocStore, $inboxNotificationsByContextStore)}
        spaceActions={[starSpace]}
      />
    {/each}

    <svelte:fragment slot="visible">
      {#if visibleSpace}
        <SpacesNavItem
          {model}
          space={visibleSpace}
          {currentSpace}
          {currentSpecial}
          {currentFragment}
          {deselect}
          isChanged={isChanged(visibleSpace, $notifyContextByDocStore, $inboxNotificationsByContextStore)}
          spaceActions={[starSpace]}
          forciblyСollapsed
        />
      {/if}
    </svelte:fragment>
  </TreeNode>
{:else}
  <Component
    is={model?.spacePresenter}
    props={{
      model,
      actions: async () => getParentActions(),
      currentSpace,
      currentSpecial,
      currentFragment,
      visible,
      visibleIf,
      spaces
    }}
  />
{/if}
