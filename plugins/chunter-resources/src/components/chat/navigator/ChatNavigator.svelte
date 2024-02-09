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
  import { Class, Doc, Ref } from '@hcengineering/core'
  import {
    getCurrentLocation,
    IModeSelector,
    ModeSelector,
    navigate,
    location as locationStore,
    Scroller,
    SearchEdit,
    Label,
    Button,
    IconAdd,
    showPopup,
    Menu,
    Action
  } from '@hcengineering/ui'
  import { DocNotifyContext, InboxNotification } from '@hcengineering/notification'
  import { SpecialNavModel } from '@hcengineering/workbench'
  import { NavLink } from '@hcengineering/view-resources'
  import { TreeSeparator } from '@hcengineering/workbench-resources'
  import { getResource, type IntlString } from '@hcengineering/platform'
  import { getNotificationsCount, InboxNotificationsClientImpl } from '@hcengineering/notification-resources'
  import { getClient } from '@hcengineering/presentation'
  import activity from '@hcengineering/activity'

  import chunter from '../../../plugin'
  import ChatNavGroup from './ChatNavGroup.svelte'
  import { Mode } from '../types'
  import { chatNavGroupsModel, chatSpecials } from '../utils'
  import ChatSpecialElement from './ChatSpecialElement.svelte'
  import { userSearch } from '../../../index'
  import { navigateToSpecial } from '../../../utils'

  export let selectedContextId: Ref<DocNotifyContext> | undefined
  export let selectedObjectClass: Ref<Class<DocNotifyContext>> | undefined
  export let currentSpecial: SpecialNavModel | undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const notificationClient = InboxNotificationsClientImpl.getClient()
  const contextsStore = notificationClient.docNotifyContexts
  const notificationsByContextStore = notificationClient.inboxNotificationsByContext

  const actions = [
    {
      label: chunter.string.NewChannel,
      icon: chunter.icon.Hashtag,
      action: async (_id: Ref<Doc>): Promise<void> => {
        showPopup(chunter.component.CreateChannel, {}, 'top')
      }
    },
    {
      label: chunter.string.NewDirectChat,
      icon: chunter.icon.Thread,
      action: async (_id: Ref<Doc>): Promise<void> => {
        showPopup(chunter.component.CreateDirectChat, {}, 'top')
      }
    }
  ]

  const searchValue: string = ''

  const modesConfig: Array<[Mode, IntlString, object]> = chatNavGroupsModel.map(({ id, tabLabel }) => [
    id,
    tabLabel,
    {}
  ])

  let modeSelectorProps: IModeSelector
  let mode: Mode | undefined
  let notifyModes: Mode[] = []

  $: mode = ($locationStore.query?.mode ?? undefined) as Mode | undefined

  $: if (mode === undefined) {
    ;[[mode]] = modesConfig
  }

  $: modeSelectorProps = {
    mode: (mode ?? modesConfig[0][0]) as string,
    config: modesConfig,
    onChange: (mode: string) => {
      handleModeChanged(mode as Mode)
    }
  }

  $: getModesWithNotifications($contextsStore, $notificationsByContextStore).then((res) => {
    notifyModes = res
  })

  $: updateSelectedContextMode(selectedObjectClass)

  $: model = chatNavGroupsModel.find(({ id }) => id === mode) ?? chatNavGroupsModel[0]

  function updateSelectedContextMode (objectClass?: Ref<Class<Doc>>) {
    if (objectClass === undefined) {
      return
    }

    if (hierarchy.isDerived(objectClass, chunter.class.Channel)) {
      if (mode !== 'channels') {
        handleModeChanged('channels')
        modeSelectorProps.mode = 'channels'
      }
    } else if (hierarchy.isDerived(objectClass, chunter.class.DirectMessage)) {
      if (mode !== 'direct') {
        handleModeChanged('direct')
        modeSelectorProps.mode = 'direct'
      }
    } else if (mode !== 'activity') {
      handleModeChanged('activity')
      modeSelectorProps.mode = 'activity'
    }
  }

  function handleModeChanged (newMode: Mode) {
    const loc = getCurrentLocation()

    mode = newMode
    loc.query = { ...loc.query, mode }
    navigate(loc)
  }

  async function isSpecialVisible (special: SpecialNavModel, docNotifyContexts: DocNotifyContext[]) {
    if (special.visibleIf === undefined) {
      return true
    }

    const getIsVisible = await getResource(special.visibleIf)

    return await getIsVisible(docNotifyContexts as any)
  }

  async function addButtonClicked (ev: MouseEvent) {
    showPopup(Menu, { actions }, ev.target as HTMLElement)
  }

  async function getModesWithNotifications (
    contexts: DocNotifyContext[],
    inboxNotificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>
  ) {
    const contextIds = Array.from(inboxNotificationsByContext.keys())
    const modes: Mode[] = []

    for (const contextId of contextIds) {
      if (modes.length === 3) {
        break
      }

      const context = contexts.find(({ _id }) => _id === contextId)

      if (
        context === undefined ||
        hierarchy.classHierarchyMixin(context.attachedToClass, activity.mixin.ActivityDoc) === undefined
      ) {
        continue
      }

      let tmpMode: Mode = 'activity'

      if (hierarchy.isDerived(context.attachedToClass, chunter.class.Channel)) {
        tmpMode = 'channels'
      } else if (hierarchy.isDerived(context.attachedToClass, chunter.class.DirectMessage)) {
        tmpMode = 'direct'
      }

      if (modes.includes(tmpMode)) {
        continue
      }

      const notificationsCount = await getNotificationsCount(context, inboxNotificationsByContext.get(contextId))

      if (notificationsCount > 0) {
        modes.push(tmpMode)
      }
    }

    return modes
  }
</script>

<Scroller shrink>
  <div class="header">
    <div class="overflow-label">
      <Label label={chunter.string.Chat} />
    </div>
    <Button icon={IconAdd} kind="primary" size="medium" iconProps={{ size: 'small' }} on:click={addButtonClicked} />
  </div>

  {#each chatSpecials as special, row}
    {#if row > 0 && chatSpecials[row].position !== chatSpecials[row - 1].position}
      <TreeSeparator line />
    {/if}
    {#await isSpecialVisible(special, $contextsStore) then isVisible}
      {#if isVisible}
        <NavLink space={special.id}>
          <ChatSpecialElement {special} {currentSpecial} />
        </NavLink>
      {/if}
    {/await}
  {/each}

  <div class="search">
    <SearchEdit
      value={searchValue}
      width="auto"
      on:change={(ev) => {
        userSearch.set(ev.detail)

        if (ev.detail !== '') {
          navigateToSpecial('chunterBrowser')
        }
      }}
    />
  </div>

  <ModeSelector
    props={modeSelectorProps}
    kind="separated-free"
    padding="0"
    expansion="stretch"
    notifyFor={notifyModes}
  />
  <ChatNavGroup {selectedContextId} {model} on:select />
  <div class="antiNav-space" />
</Scroller>

<style lang="scss">
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.75rem;
    margin-left: 1.25rem;
    font-weight: 700;
    font-size: 1.25rem;
    color: var(--theme-content-color);
  }
  .search {
    padding: 12px;
  }
</style>
