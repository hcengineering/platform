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
  import notification, {
    ActivityNotificationViewlet,
    DisplayInboxNotification,
    DocNotifyContext
  } from '@hcengineering/notification'
  import { ActionContext, createQuery, getClient } from '@hcengineering/presentation'
  import view, { Viewlet } from '@hcengineering/view'
  import {
    AnyComponent,
    Component,
    defineSeparators,
    Label,
    Loading,
    location as locationStore,
    Scroller,
    Separator,
    TabItem,
    TabList,
    Location
  } from '@hcengineering/ui'
  import chunter, { ThreadMessage } from '@hcengineering/chunter'
  import { Ref, WithLookup } from '@hcengineering/core'
  import { ViewletSelector } from '@hcengineering/view-resources'
  import activity, { ActivityMessage } from '@hcengineering/activity'
  import { isReactionMessage, loadSavedMessages } from '@hcengineering/activity-resources'
  import { onMount } from 'svelte'

  import { inboxMessagesStore, InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import Filter from '../Filter.svelte'
  import { getDisplayInboxNotifications, openInboxDoc, resolveLocation } from '../../utils'
  import { InboxNotificationsFilter } from '../../types'

  export let visibleNav: boolean = true
  export let navFloat: boolean = false
  export let appsDirection: 'vertical' | 'horizontal' = 'horizontal'

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const inboxClient = InboxNotificationsClientImpl.getClient()
  const notificationsByContextStore = inboxClient.inboxNotificationsByContext
  const notifyContextsStore = inboxClient.docNotifyContexts

  const messagesQuery = createQuery()

  const allTab: TabItem = {
    id: 'all',
    labelIntl: notification.string.All
  }
  const channelTab: TabItem = {
    id: chunter.class.Channel,
    labelIntl: chunter.string.Channels
  }
  const directTab: TabItem = {
    id: chunter.class.DirectMessage,
    labelIntl: chunter.string.Direct
  }

  let displayNotifications: DisplayInboxNotification[] = []
  let displayContextsIds = new Set<Ref<DocNotifyContext>>()

  let messagesIds: Ref<ActivityMessage>[] = []

  let filteredNotifications: DisplayInboxNotification[] = []
  let filter: InboxNotificationsFilter = 'all'

  let tabItems: TabItem[] = []
  let selectedTabId: string = allTab.id

  let selectedContextId: Ref<DocNotifyContext> | undefined = undefined
  let selectedContext: DocNotifyContext | undefined = undefined
  let selectedComponent: AnyComponent | undefined = undefined

  let viewlets: ActivityNotificationViewlet[] = []

  let viewlet: WithLookup<Viewlet> | undefined
  let loading = true

  client.findAll(notification.class.ActivityNotificationViewlet, {}).then((res) => {
    viewlets = res
  })

  $: getDisplayInboxNotifications($notificationsByContextStore, filter).then((res) => {
    displayNotifications = res
  })
  $: displayContextsIds = new Set(displayNotifications.map(({ docNotifyContext }) => docNotifyContext))

  $: filteredNotifications = filterNotifications(selectedTabId, displayNotifications, $notifyContextsStore)

  locationStore.subscribe((newLocation) => {
    syncLocation(newLocation)
  })

  inboxClient.activityInboxNotifications.subscribe((notifications) => {
    messagesIds = notifications.map(({ attachedTo }) => attachedTo)
  })

  $: messagesQuery.query(
    activity.class.ActivityMessage,
    {
      _id: { $in: messagesIds }
    },
    (result) => {
      inboxMessagesStore.set(result)
    }
  )

  async function syncLocation (newLocation: Location) {
    const loc = await resolveLocation(newLocation)

    selectedContextId = loc?.loc.path[3] as Ref<DocNotifyContext> | undefined

    if (selectedContextId !== selectedContext?._id) {
      selectedContext = undefined
    }
  }

  $: selectedContext = selectedContextId
    ? selectedContext ?? $notifyContextsStore.find(({ _id }) => _id === selectedContextId)
    : undefined

  $: updateSelectedPanel(selectedContext)
  $: updateTabItems(displayContextsIds, $notifyContextsStore)

  function updateTabItems (displayContextsIds: Set<Ref<DocNotifyContext>>, notifyContexts: DocNotifyContext[]): void {
    const displayClasses = new Set(
      notifyContexts
        .filter(
          ({ _id, attachedToClass }) =>
            displayContextsIds.has(_id) && !hierarchy.isDerived(attachedToClass, activity.class.ActivityMessage)
        )
        .map(({ attachedToClass }) => attachedToClass)
    )

    const fixedTabs = [
      allTab,
      displayClasses.has(chunter.class.Channel) ? channelTab : undefined,
      displayClasses.has(chunter.class.DirectMessage) ? directTab : undefined
    ].filter((tab): tab is TabItem => tab !== undefined)

    tabItems = fixedTabs.concat(
      Array.from(displayClasses.values())
        .filter((_class) => ![chunter.class.Channel, chunter.class.DirectMessage].includes(_class))
        .map((_class) => ({
          id: _class,
          // TODO: need to get plural form
          labelIntl: hierarchy.getClass(_class).label
        }))
    )
  }

  function selectTab (event: CustomEvent) {
    if (event.detail !== undefined) {
      selectedTabId = event.detail.id
    }
  }

  async function selectContext (event?: CustomEvent) {
    selectedContext = event?.detail?.context
    selectedContextId = selectedContext?._id

    if (selectedContext === undefined) {
      openInboxDoc()
      return
    }

    if (hierarchy.isDerived(selectedContext.attachedToClass, activity.class.ActivityMessage)) {
      const message = event?.detail?.notification?.$lookup?.attachedTo

      if (selectedContext.attachedToClass === chunter.class.ThreadMessage) {
        const thread = await client.findOne(chunter.class.ThreadMessage, {
          _id: selectedContext.attachedTo as Ref<ThreadMessage>
        })
        openInboxDoc(selectedContext._id, thread?.attachedTo, thread?._id)
      } else if (isReactionMessage(message)) {
        openInboxDoc(selectedContext._id, undefined, selectedContext.attachedTo as Ref<ActivityMessage>)
      } else {
        openInboxDoc(
          selectedContext._id,
          selectedContext.attachedTo as Ref<ActivityMessage>,
          event?.detail?.notification?.attachedTo
        )
      }
    } else {
      openInboxDoc(selectedContext._id, undefined, event?.detail?.notification?.attachedTo)
    }
  }

  async function updateSelectedPanel (selectedContext?: DocNotifyContext) {
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
    selectedTabId: string,
    displayNotifications: DisplayInboxNotification[],
    notifyContexts: DocNotifyContext[]
  ) {
    if (selectedTabId === allTab.id) {
      return displayNotifications
    }

    return displayNotifications.filter(({ docNotifyContext }) => {
      const context = notifyContexts.find(({ _id }) => _id === docNotifyContext)

      return context !== undefined && context.attachedToClass === selectedTabId
    })
  }

  defineSeparators('inbox', [
    { minSize: 30, maxSize: 50, size: 40, float: 'navigator' },
    { size: 'auto', minSize: 30, maxSize: 'auto', float: undefined }
  ])

  onMount(() => {
    loadSavedMessages()
  })
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="flex-row-top h-full">
  {#if visibleNav}
    <div
      class="antiPanel-navigator {appsDirection === 'horizontal'
        ? 'portrait'
        : 'landscape'} background-comp-header-color"
    >
      <div class="antiPanel-wrap__content">
        <div class="ac-header full divide caption-height">
          <div class="ac-header__wrap-title mr-3">
            <span class="ac-header__title"><Label label={notification.string.Inbox} /></span>
          </div>
          <div class="flex-grow">
            <ViewletSelector
              bind:viewlet
              bind:loading
              viewletQuery={{ attachTo: notification.class.DocNotifyContext }}
            />
          </div>
          <div class="flex flex-gap-2">
            <Filter bind:filter />
          </div>
        </div>

        <div class="tabs">
          <TabList items={tabItems} selected={selectedTabId} on:select={selectTab} />
        </div>

        {#if loading || !viewlet?.$lookup?.descriptor}
          <Loading />
        {:else if viewlet}
          <Scroller padding="1rem 0">
            <Component
              is={viewlet.$lookup.descriptor.component}
              props={{
                notifications: filteredNotifications,
                viewlets,
                selectedContext
              }}
              on:click={selectContext}
            />
          </Scroller>
        {/if}
      </div>
      <Separator name="inbox" float={navFloat ? 'navigator' : true} index={0} />
    </div>
    <Separator name="inbox" float={navFloat} index={0} />
  {/if}
  <div class="antiPanel-component filled w-full">
    {#if selectedContext && selectedComponent}
      <Component
        is={selectedComponent}
        props={{
          _id: selectedContext.attachedTo,
          _class: selectedContext.attachedToClass,
          embedded: true,
          context: selectedContext,
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
    margin: 0.5rem;
    margin-bottom: 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--theme-navpanel-border);
  }
</style>
