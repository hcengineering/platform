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
  import { DocNotifyContext, InboxNotification, notificationId } from '@hcengineering/notification'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import view, { decodeObjectURI } from '@hcengineering/view'
  import {
    AnyComponent,
    Component,
    defineSeparators,
    Label,
    location as locationStore,
    Location,
    restoreLocation,
    Scroller,
    Separator,
    TabItem,
    TabList,
    deviceOptionsStore as deviceInfo
  } from '@hcengineering/ui'
  import chunter from '@hcengineering/chunter'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { get } from 'svelte/store'
  import { translate } from '@hcengineering/platform'
  import { getCurrentAccount, groupByArray, IdMap, Ref, SortingOrder } from '@hcengineering/core'
  import { parseLinkId } from '@hcengineering/view-resources'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import SettingsButton from './SettingsButton.svelte'
  import { getDisplayInboxData, resetInboxContext, resolveLocation, selectInboxContext } from '../../utils'
  import { InboxData, InboxNotificationsFilter } from '../../types'
  import InboxGroupedListView from './InboxGroupedListView.svelte'
  import notification from '../../plugin'
  import InboxMenuButton from './InboxMenuButton.svelte'

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const me = getCurrentAccount()

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

  let showArchive = false
  let archivedActivityNotifications: InboxNotification[] = []
  let archivedOtherNotifications: InboxNotification[] = []
  let archivedNotifications: InboxNotification[] = []

  let inboxData: InboxData = new Map()

  let filteredData: InboxData = new Map()
  let filter: InboxNotificationsFilter = (localStorage.getItem('inbox-filter') as InboxNotificationsFilter) ?? 'all'

  let tabItems: TabItem[] = []
  let selectedTabId: string = allTab.id

  let selectedContextId: Ref<DocNotifyContext> | undefined = undefined
  let selectedContext: DocNotifyContext | undefined = undefined
  let selectedComponent: AnyComponent | undefined = undefined

  let selectedMessage: ActivityMessage | undefined = undefined

  $: if (showArchive) {
    archivedActivityNotificationsQuery.query(
      notification.class.ActivityInboxNotification,
      { archived: true, user: me._id },
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
      notification.class.InboxNotification,
      { _class: { $nin: [notification.class.ActivityInboxNotification] }, archived: true, user: me._id },
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

  $: filteredData = filterData(filter, selectedTabId, inboxData, $contextByIdStore)

  locationStore.subscribe((newLocation) => {
    void syncLocation(newLocation)
  })

  async function syncLocation (newLocation: Location): Promise<void> {
    const loc = await resolveLocation(newLocation)
    if (loc?.loc.path[2] !== notificationId) {
      return
    }

    if (loc?.loc.path[3] == null) {
      selectedContext = undefined
      restoreLocation(newLocation, notificationId)
      return
    }

    const [id, _class] = decodeObjectURI(loc?.loc.path[3] ?? '')
    const _id = await parseLinkId(linkProviders, id, _class)
    const context = _id ? $contextByDocStore.get(_id) : undefined

    selectedContextId = context?._id

    if (selectedContextId !== selectedContext?._id) {
      selectedContext = undefined
    }

    const selectedMessageId = loc?.loc.query?.message as Ref<ActivityMessage> | undefined

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

  $: void updateSelectedPanel(selectedContext)
  $: void updateTabItems(inboxData, $contextsStore)

  async function updateTabItems (inboxData: InboxData, notifyContexts: DocNotifyContext[]): Promise<void> {
    const displayClasses = new Set(
      notifyContexts.filter(({ _id }) => inboxData.has(_id)).map(({ attachedToClass }) => attachedToClass)
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
    selectedContext = event?.detail?.context
    selectedContextId = selectedContext?._id

    if (selectedContext === undefined) {
      resetInboxContext()
      return
    }

    const selectedNotification: InboxNotification | undefined = event?.detail?.notification

    void selectInboxContext(linkProviders, selectedContext, selectedNotification)
  }

  async function updateSelectedPanel (selectedContext?: DocNotifyContext): Promise<void> {
    if (selectedContext === undefined) {
      selectedComponent = undefined
      return
    }

    const isChunterChannel = hierarchy.isDerived(selectedContext.attachedToClass, chunter.class.ChunterSpace)
    const panelComponent = hierarchy.classHierarchyMixin(selectedContext.attachedToClass, view.mixin.ObjectPanel)

    selectedComponent = panelComponent?.component ?? view.component.EditDoc

    const contextNotifications = $notificationsByContextStore.get(selectedContext._id) ?? []

    const doneOp = await getClient().measure('readNotifications')
    const ops = getClient().apply(selectedContext._id)
    try {
      await inboxClient.readNotifications(
        ops,
        contextNotifications
          .filter(({ _class, isViewed }) =>
            isChunterChannel ? _class === notification.class.CommonInboxNotification : !isViewed
          )
          .map(({ _id }) => _id)
      )
    } finally {
      await ops.commit()
      await doneOp()
    }
  }

  function filterNotifications (
    filter: InboxNotificationsFilter,
    notifications: InboxNotification[]
  ): InboxNotification[] {
    switch (filter) {
      case 'unread':
        return notifications.filter(({ isViewed }) => !isViewed)
      case 'all':
        return notifications
    }
  }

  function filterData (
    filter: InboxNotificationsFilter,
    selectedTabId: string,
    inboxData: InboxData,
    contextById: IdMap<DocNotifyContext>
  ): InboxData {
    if (selectedTabId === allTab.id && filter === 'all') {
      return inboxData
    }

    const result = new Map()

    for (const [key, notifications] of inboxData) {
      const resNotifications = filterNotifications(filter, notifications)

      if (resNotifications.length === 0) {
        continue
      }

      if (selectedTabId === allTab.id) {
        result.set(key, resNotifications)
        continue
      }

      const context = contextById.get(key)

      if (context === undefined) {
        continue
      }

      if (
        selectedTabId === activity.class.ActivityMessage &&
        hierarchy.isDerived(context.attachedToClass, activity.class.ActivityMessage)
      ) {
        result.set(key, resNotifications)
      } else if (context.attachedToClass === selectedTabId) {
        result.set(key, resNotifications)
      }
    }

    return result
  }

  defineSeparators('inbox', [
    { minSize: 20, maxSize: 50, size: 40, float: 'navigator' },
    { size: 'auto', minSize: 30, maxSize: 'auto', float: undefined }
  ])

  function onArchiveToggled (): void {
    showArchive = !showArchive
    selectedTabId = allTab.id
  }

  function onUnreadsToggled (): void {
    filter = filter === 'unread' ? 'all' : 'unread'
    localStorage.setItem('inbox-filter', filter)
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
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="flex-row-top h-full">
  {#if $deviceInfo.navigator.visible}
    <div
      class="antiPanel-navigator {$deviceInfo.navigator.direction === 'horizontal'
        ? 'portrait'
        : 'landscape'} background-comp-header-color"
    >
      <div class="antiPanel-wrap__content">
        <div class="ac-header full divide caption-height" style:padding="0.5rem var(--spacing-1_5)">
          <div class="ac-header__wrap-title mr-3">
            <span class="title"><Label label={notification.string.Inbox} /></span>
          </div>
          <div class="flex flex-gap-2">
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
      <Separator name="inbox" float={$deviceInfo.navigator.float ? 'navigator' : true} index={0} />
    </div>
    <Separator name="inbox" float={$deviceInfo.navigator.float} index={0} />
  {/if}
  <div class="antiPanel-component filled w-full">
    {#if selectedContext && selectedComponent}
      <Component
        is={selectedComponent}
        props={{
          _id: selectedContext.attachedTo,
          _class: selectedContext.attachedToClass,
          context: selectedContext,
          activityMessage: selectedMessage,
          props: { context: selectedContext }
        }}
        on:close={() => selectContext(undefined)}
      />
    {/if}
  </div>
</div>

<style lang="scss">
  .tabs {
    display: flex;
    padding: 0 var(--spacing-1_5);
    border-bottom: 1px solid var(--theme-navpanel-border);
  }

  .title {
    font-weight: 600;
    font-size: 1.25rem;
    color: var(--global-primary-TextColor);
  }
</style>
