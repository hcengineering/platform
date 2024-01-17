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
  import notification, { DisplayInboxNotification, DocNotifyContext } from '@hcengineering/notification'
  import { ActionContext, getClient } from '@hcengineering/presentation'
  import { Viewlet, ViewletPreference } from '@hcengineering/view'
  import { ViewletSelector } from '@hcengineering/view-resources'
  import { Class, Doc, Ref, WithLookup } from '@hcengineering/core'
  import { Component, Label, Loading, TabItem, TabList } from '@hcengineering/ui'
  import activity from '@hcengineering/activity'
  import chunter from '@hcengineering/chunter'

  import { InboxNotificationsClientImpl } from '../../inboxNotificationsClient'
  import Filter from '../Filter.svelte'
  import { getDisplayInboxNotifications } from '../../utils'
  import { InboxNotificationsFilter } from '../../types'

  export let _class: Ref<Class<Doc>> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const inboxClient = InboxNotificationsClientImpl.getClient()
  const inboxNotificationsByContextStore = inboxClient.inboxNotificationsByContext
  const notifyContextsStore = inboxClient.docNotifyContexts

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
  let filteredNotifications: DisplayInboxNotification[] = []
  let filter: InboxNotificationsFilter = 'all'
  let tabItems: TabItem[] = []
  let displayContextsIds = new Set<Ref<DocNotifyContext>>()
  let selectedTabId: string = allTab.id

  let viewlet: WithLookup<Viewlet> | undefined
  let preference: ViewletPreference | undefined = undefined
  let loading = true

  $: getDisplayInboxNotifications($inboxNotificationsByContextStore, filter, _class).then((res) => {
    displayNotifications = res
  })

  $: displayContextsIds = new Set(displayNotifications.map(({ docNotifyContext }) => docNotifyContext))
  $: updateTabItems(displayContextsIds, $notifyContextsStore)
  $: filteredNotifications = filterNotifications(selectedTabId, displayNotifications, $notifyContextsStore)

  function updateTabItems (displayContextsIds: Set<Ref<DocNotifyContext>>, notifyContexts: DocNotifyContext[]): void {
    const displayClasses = new Set(
      notifyContexts
        .filter(
          ({ _id, attachedToClass }) =>
            displayContextsIds.has(_id) && !hierarchy.isDerived(activity.class.ActivityMessage, attachedToClass)
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
</script>

<ActionContext
  context={{
    mode: 'browser'
  }}
/>

<div class="ac-header full divide caption-height">
  <div class="ac-header__wrap-title mr-3">
    <span class="ac-header__title"><Label label={notification.string.Inbox} /></span>
  </div>
  <div class="flex flex-gap-2">
    <Filter bind:filter />
  </div>

  <ViewletSelector
    bind:viewlet
    bind:preference
    bind:loading
    viewletQuery={{ attachTo: notification.class.DocNotifyContext }}
  />
</div>

<div class="tabs">
  <TabList items={tabItems} selected={selectedTabId} on:select={selectTab} />
</div>

{#if loading || !viewlet?.$lookup?.descriptor}
  <Loading />
{:else if viewlet}
  <div class="content">
    <Component
      is={viewlet.$lookup.descriptor.component}
      props={{
        notifications: filteredNotifications,
        displayContextsIds
      }}
    />
  </div>
{/if}

<style lang="scss">
  .content {
    margin: 0.5rem;
  }

  .tabs {
    display: flex;
    margin: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--theme-navpanel-border);
  }
</style>
