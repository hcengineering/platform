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
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import chunter from '@hcengineering/chunter'
  import { Class, Doc, getCurrentAccount, groupByArray, Ref, SortingOrder } from '@hcengineering/core'
  import { DocNotifyContext, InboxNotification, notificationId } from '@hcengineering/notification'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import {
    AnyComponent,
    closePanel,
    Component,
    defineSeparators,
    deviceOptionsStore as deviceInfo,
    getCurrentLocation,
    Label,
    Location,
    location as locationStore,
    restoreLocation,
    Scroller,
    Separator,
    TabItem,
    TabList
  } from '@hcengineering/ui'
  import view, { decodeObjectURI } from '@hcengineering/view'
  import { parseLinkId } from '@hcengineering/view-resources'
  import { get } from 'svelte/store'
  import { getResource } from '@hcengineering/platform'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import notification from '../../plugin'
  import { InboxData, InboxNotificationsFilter } from '../../types'
  import { getDisplayInboxData, resetInboxContext, resolveLocation, selectInboxContext } from '../../utils'
  import InboxGroupedListView from './InboxGroupedListView.svelte'
  import InboxMenuButton from './InboxMenuButton.svelte'
  import { onDestroy } from 'svelte'
  import SettingsButton from './SettingsButton.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const acc = getCurrentAccount()

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notificationsByContextStore = inboxClient.inboxNotificationsByContext
  const contextByIdStore = inboxClient.contextById
  const contextByDocStore = inboxClient.contextByDoc
  const contextsStore = inboxClient.contexts

  const archivedActivityNotificationsQuery = createQuery()
  const archivedOtherNotificationsQuery = createQuery()

  const allTab: TabItem = {
    id: 'all',
    labelIntl: notification.string.All
  }

  const linkProviders = client.getModel().findAllSync(view.mixin.LinkIdProvider, {})

  let urlObjectId: Ref<Doc> | undefined = undefined
  let urlObjectClass: Ref<Class<Doc>> | undefined = undefined

  let showArchive = false
  let archivedActivityNotifications: InboxNotification[] = []
  let archivedOtherNotifications: InboxNotification[] = []
  let archivedNotifications: InboxNotification[] = []

  let inboxData: InboxData = new Map()

  let filteredData: InboxData = new Map()
  let filter: InboxNotificationsFilter = (localStorage.getItem('inbox-filter') as InboxNotificationsFilter) ?? 'all'

  let tabItems: TabItem[] = []
  let selectedTabId: string | number = allTab.id

  let selectedContextId: Ref<DocNotifyContext> | undefined = undefined
  let selectedContext: DocNotifyContext | undefined = undefined
  let selectedComponent: AnyComponent | undefined = undefined

  let selectedMessage: ActivityMessage | undefined = undefined

  let replacedPanel: HTMLElement

  $: if (showArchive) {
    archivedActivityNotificationsQuery.query(
      notification.class.ActivityInboxNotification,
      { archived: true, user: acc.uuid },
      (res) => {
        archivedActivityNotifications = res
      },
      {
        lookup: {
          attachedTo: activity.class.ActivityMessage
        },
        sort: {
          createdOn: SortingOrder.Descending
        },
        limit: 1000
      }
    )

    archivedOtherNotificationsQuery.query(
      notification.class.CommonInboxNotification,
      { archived: true, user: acc.uuid },
      (res) => {
        archivedOtherNotifications = res
      },
      {
        sort: {
          createdOn: SortingOrder.Descending
        },
        limit: 500
      }
    )
  }

  $: archivedNotifications = [...archivedActivityNotifications, ...archivedOtherNotifications].sort(
    (n1, n2) => (n2.createdOn ?? n2.modifiedOn) - (n1.createdOn ?? n1.modifiedOn)
  )
  $: void updateInboxData($notificationsByContextStore, archivedNotifications, showArchive)

  async function updateInboxData (
    notificationsByContext: Map<Ref<DocNotifyContext>, InboxNotification[]>,
    archivedNotifications: InboxNotification[],
    showArchive: boolean
  ): Promise<void> {
    if (showArchive) {
      inboxData = await getDisplayInboxData(groupByArray(archivedNotifications, (it) => it.docNotifyContext))
    } else {
      inboxData = await getDisplayInboxData(notificationsByContext)
    }
  }

  $: filteredData = filterData(filter, selectedTabId, inboxData)

  const unsubscribeLoc = locationStore.subscribe((newLocation) => {
    void syncLocation(newLocation)
  })

  let isContextsLoaded = false

  const unsubscribeContexts = contextByDocStore.subscribe((docs) => {
    if (selectedContext !== undefined || docs.size === 0 || isContextsLoaded) {
      return
    }

    const loc = getCurrentLocation()
    void syncLocation(loc)
    isContextsLoaded = true
  })

  async function syncLocation (newLocation: Location): Promise<void> {
    const loc = await resolveLocation(newLocation)
    if (loc?.loc.path[2] !== notificationId) {
      return
    }

    if (loc?.loc.path[3] == null) {
      selectedContext = undefined
      urlObjectId = undefined
      urlObjectClass = undefined
      restoreLocation(newLocation, notificationId)
      return
    }

    const [id, _class] = decodeObjectURI(loc?.loc.path[3] ?? '')
    const _id = await parseLinkId(linkProviders, id, _class)
    urlObjectId = _id
    urlObjectClass = _class
    const thread = loc?.loc.path[4] as Ref<ActivityMessage>
    const queryContext = loc.loc.query?.context as Ref<DocNotifyContext>
    const context = $contextByIdStore.get(queryContext) ?? $contextByDocStore.get(thread) ?? $contextByDocStore.get(_id)

    selectedContextId = context?._id

    if (selectedContextId !== selectedContext?._id) {
      selectedContext = undefined
    }

    const selectedMessageId = loc?.loc.query?.message as Ref<ActivityMessage> | undefined

    if (thread !== undefined) {
      const fn = await getResource(chunter.function.OpenThreadInSidebar)
      void fn(thread, undefined, undefined, selectedMessageId, { autofocus: false })
    }

    if (selectedMessageId !== undefined) {
      selectedMessage = get(inboxClient.activityInboxNotifications).find(
        ({ attachedTo }) => attachedTo === selectedMessageId
      )?.$lookup?.attachedTo
      if (selectedMessage === undefined) {
        selectedMessage = await client.findOne(activity.class.ActivityMessage, { _id: selectedMessageId })
      }
    }
  }

  $: selectedContext = selectedContextId ? selectedContext ?? $contextByIdStore.get(selectedContextId) : undefined

  $: void updateSelectedPanel(selectedContext, urlObjectClass)
  $: void updateTabItems(inboxData, $contextsStore)

  async function updateTabItems (inboxData: InboxData, notifyContexts: DocNotifyContext[]): Promise<void> {
    const displayClasses = new Set(
      notifyContexts.filter(({ _id }) => inboxData.has(_id)).map(({ objectClass }) => objectClass)
    )

    const classes = Array.from(displayClasses)
    const tabs: TabItem[] = []

    let messagesTab: TabItem | undefined = undefined

    for (const _class of classes) {
      if (hierarchy.isDerived(_class, activity.class.ActivityMessage)) {
        if (messagesTab === undefined) {
          messagesTab = {
            id: activity.class.ActivityMessage,
            labelIntl: activity.string.Messages
          }
        }
        continue
      }

      const clazz = hierarchy.getClass(_class)
      const intlLabel = clazz.pluralLabel ?? clazz.label ?? _class
      tabs.push({
        id: _class,
        labelIntl: intlLabel
      })
    }

    if (messagesTab !== undefined) {
      tabs.push(messagesTab)
    }

    tabItems = [allTab].concat(tabs.sort((a, b) => (a.label ?? '').localeCompare(b.label ?? '')))
  }

  function selectTab (event: CustomEvent): void {
    if (event.detail !== undefined) {
      selectedTabId = event.detail.id
    }
  }

  async function selectContext (event?: CustomEvent): Promise<void> {
    closePanel()
    selectedContext = event?.detail?.context
    selectedContextId = selectedContext?._id

    if (selectedContext === undefined) {
      resetInboxContext()
      return
    }

    const selectedNotification: InboxNotification | undefined = event?.detail?.notification

    void selectInboxContext(linkProviders, selectedContext, selectedNotification, event?.detail.object)
  }
  function isChunterChannel (selectedContext: DocNotifyContext, urlObjectClass?: Ref<Class<Doc>>): boolean {
    const isActivityMessageContext = hierarchy.isDerived(selectedContext.objectClass, activity.class.ActivityMessage)
    const chunterClass = isActivityMessageContext
      ? urlObjectClass ?? selectedContext.objectClass
      : selectedContext.objectClass
    return hierarchy.isDerived(chunterClass, chunter.class.ChunterSpace)
  }

  async function updateSelectedPanel (
    selectedContext?: DocNotifyContext,
    urlObjectClass?: Ref<Class<Doc>>
  ): Promise<void> {
    if (selectedContext === undefined) {
      selectedComponent = undefined
      return
    }

    const isChunter = isChunterChannel(selectedContext, urlObjectClass)
    const panelComponent = hierarchy.classHierarchyMixin(
      isChunter ? urlObjectClass ?? selectedContext.objectClass : selectedContext.objectClass,
      view.mixin.ObjectPanel
    )

    selectedComponent = panelComponent?.component ?? view.component.EditDoc

    const contextNotifications = $notificationsByContextStore.get(selectedContext._id) ?? []

    const ops = getClient().apply(undefined, 'readNotifications')
    try {
      await inboxClient.readNotifications(
        ops,
        contextNotifications
          .filter(({ _class, isViewed }) =>
            isChunter ? _class === notification.class.CommonInboxNotification : !isViewed
          )
          .map(({ _id }) => _id)
      )
    } finally {
      await ops.commit()
    }
  }

  function filterData (
    filter: InboxNotificationsFilter,
    selectedTabId: string | number,
    inboxData: InboxData
  ): InboxData {
    if (selectedTabId === allTab.id && filter === 'all') {
      return inboxData
    }

    const result = new Map()

    for (const [key, notifications] of inboxData) {
      if (filter === 'unread' && key !== selectedContext?._id && !notifications.some(({ isViewed }) => !isViewed)) {
        continue
      }

      if (notifications.length === 0) {
        continue
      }

      if (selectedTabId === allTab.id) {
        result.set(key, notifications)
        continue
      }

      const context = $contextByIdStore.get(key)

      if (context === undefined) {
        continue
      }

      if (
        selectedTabId === activity.class.ActivityMessage &&
        hierarchy.isDerived(context.objectClass, activity.class.ActivityMessage)
      ) {
        result.set(key, notifications)
      } else if (context.objectClass === selectedTabId) {
        result.set(key, notifications)
      }
    }

    return result
  }

  defineSeparators('inbox', [
    { minSize: 20, maxSize: 50, size: 40, float: 'navigator' },
    { size: 'auto', minSize: 20, maxSize: 'auto' },
    { size: 20, minSize: 20, maxSize: 50, float: 'aside' }
  ])

  function onArchiveToggled (): void {
    showArchive = !showArchive
    selectedTabId = allTab.id
    void selectContext(undefined)
  }

  function onUnreadsToggled (): void {
    filter = filter === 'unread' ? 'all' : 'unread'
    localStorage.setItem('inbox-filter', filter)
    void selectContext(undefined)
  }

  $: items = [
    {
      id: 'unread',
      on: filter === 'unread',
      label: notification.string.Unreads,
      onToggle: onUnreadsToggled
    },
    {
      id: 'archive',
      on: showArchive,
      label: view.string.Archived,
      onToggle: onArchiveToggled
    }
  ]
  $: $deviceInfo.replacedPanel = replacedPanel

  onDestroy(() => {
    $deviceInfo.replacedPanel = undefined
    unsubscribeLoc()
    unsubscribeContexts()
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="hulyPanels-container">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} border-left"
      class:fly={$deviceInfo.navigator.float}
    >
      <div class="antiPanel-wrap__content hulyNavPanel-container">
        <div class="hulyNavPanel-header withButton small">
          <span class="overflow-label"><Label label={notification.string.Inbox} /></span>
          <div class="flex-row-center flex-gap-2">
            <SettingsButton {items} />
            <InboxMenuButton />
          </div>
        </div>

        <div class="tabs">
          <TabList items={tabItems} selected={selectedTabId} on:select={selectTab} padding={'var(--spacing-1) 0'} />
        </div>

        <Scroller padding="0">
          <InboxGroupedListView
            data={filteredData}
            selectedContext={selectedContextId}
            archived={showArchive}
            on:click={selectContext}
          />
        </Scroller>
      </div>
      {#if !($deviceInfo.isMobile && $deviceInfo.isPortrait && $deviceInfo.minWidth)}
        <Separator name="inbox" float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} />
      {/if}
    </div>
    <Separator
      name="inbox"
      float={$deviceInfo.navigator.float}
      index={0}
      color={'transparent'}
      separatorSize={0}
      short
    />
  {/if}
  <div bind:this={replacedPanel} class="hulyComponent">
    {#if selectedContext && selectedComponent}
      <Component
        is={selectedComponent}
        props={{
          _id: isChunterChannel(selectedContext, urlObjectClass)
            ? urlObjectId ?? selectedContext.objectId
            : selectedContext.objectId,
          _class: isChunterChannel(selectedContext, urlObjectClass)
            ? urlObjectClass ?? selectedContext.objectClass
            : selectedContext.objectClass,
          autofocus: false,
          embedded: true,
          context: selectedContext,
          activityMessage: selectedMessage,
          props: { context: selectedContext, autofocus: false }
        }}
        on:close={() => selectContext(undefined)}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .tabs {
    display: flex;
    align-items: center;
    padding: var(--spacing-0_5) var(--spacing-1_5);
    border-bottom: 1px solid var(--theme-navpanel-border);
  }
</style>
