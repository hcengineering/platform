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
  import { Class, Doc, Ref, Timestamp } from '@hcengineering/core'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage, ActivityMessagesFilter } from '@hcengineering/activity'
  import { getClient } from '@hcengineering/presentation'
  import { getMessageFromLoc, messageInFocus } from '@hcengineering/activity-resources'
  import { location as locationStore } from '@hcengineering/ui'
  import { ChatExtension, ExternalChannel } from '@hcengineering/chunter'

  import chunter from '../plugin'
  import ChannelScrollView from './ChannelScrollView.svelte'
  import { ChannelDataProvider } from '../channelDataProvider'
  import { onDestroy } from 'svelte'

  export let object: Doc
  export let context: DocNotifyContext | undefined
  export let filters: Ref<ActivityMessagesFilter>[] = []
  export let isAsideOpened = false
  export let selectedChannelId: Ref<ExternalChannel> | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let dataProvider: ChannelDataProvider | undefined
  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined

  const unsubscribe = messageInFocus.subscribe((id) => {
    if (id !== undefined && id !== selectedMessageId) {
      selectedMessageId = id
    }

    messageInFocus.set(undefined)
  })

  const unsubscribeLocation = locationStore.subscribe((newLocation) => {
    const id = getMessageFromLoc(newLocation)
    selectedMessageId = id
    messageInFocus.set(id)
  })

  onDestroy(() => {
    unsubscribe()
    unsubscribeLocation()
  })

  $: isDocChannel = !hierarchy.isDerived(object._class, chunter.class.ChunterSpace)
  $: _class = isDocChannel ? activity.class.ActivityMessage : chunter.class.ChatMessage
  $: collection = isDocChannel ? 'comments' : 'messages'

  $: updateDataProvider(object._id, _class, context?.lastViewedTimestamp, selectedMessageId, selectedChannelId)

  function updateDataProvider (
    attachedTo: Ref<Doc>,
    _class: Ref<Class<ActivityMessage>>,
    lastViewedTimestamp?: Timestamp,
    selectedMessageId?: Ref<ActivityMessage>,
    channelId?: Ref<ExternalChannel>
  ): void {
    const loadAll = isDocChannel
    if (dataProvider === undefined) {
      // For now loading all messages for documents with activity. Need to correct handle aggregation with pagination.
      // Perhaps we should load all activity messages once, and keep loading in chunks only for ChatMessages then merge them correctly with activity messages
      dataProvider = new ChannelDataProvider(
        attachedTo,
        _class,
        lastViewedTimestamp ?? 0,
        selectedMessageId,
        loadAll,
        channelId
      )
    } else if (channelId !== dataProvider.externalChannel) {
      dataProvider.destroy()
      dataProvider = new ChannelDataProvider(
        attachedTo,
        _class,
        lastViewedTimestamp ?? 0,
        selectedMessageId,
        loadAll,
        channelId
      )
    }
  }
</script>

{#if dataProvider}
  {#key `${object._id}${dataProvider.externalChannel}`}
    <ChannelScrollView
      objectId={object._id}
      objectClass={object._class}
      {object}
      skipLabels={!isDocChannel}
      selectedFilters={filters}
      startFromBottom
      {selectedMessageId}
      {collection}
      provider={dataProvider}
      {isAsideOpened}
      loadMoreAllowed={!isDocChannel}
    />
  {/key}
{/if}
