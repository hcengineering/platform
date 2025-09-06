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
  import { Doc, getCurrentAccount, Ref } from '@hcengineering/core'
  import notification, { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage, WithReferences } from '@hcengineering/activity'
  import { getClient, isSpace } from '@hcengineering/presentation'
  import { getMessageFromLoc, messageInFocus } from '@hcengineering/activity-resources'
  import { location as locationStore } from '@hcengineering/ui'
  import { onDestroy } from 'svelte'

  import chunter from '../plugin'
  import { ChannelDataProvider } from '../channelDataProvider'
  import ReverseChannelScrollView from './ReverseChannelScrollView.svelte'

  export let object: Doc
  export let context: DocNotifyContext | undefined = undefined
  export let syncLocation = true
  export let autofocus = true
  export let freeze = false
  export let readonly = false
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let collection: string | undefined = undefined
  export let withInput: boolean = true
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()

  let dataProvider: ChannelDataProvider | undefined

  const unsubscribe = messageInFocus.subscribe((id) => {
    if (!syncLocation) return
    if (id !== undefined && id !== selectedMessageId) {
      selectedMessageId = id
    }

    messageInFocus.set(undefined)
  })

  const unsubscribeLocation = locationStore.subscribe((newLocation) => {
    if (!syncLocation) return
    const id = getMessageFromLoc(newLocation)
    selectedMessageId = id
    messageInFocus.set(id)
  })

  onDestroy(() => {
    unsubscribe()
    unsubscribeLocation()
    dataProvider?.destroy()
    dataProvider = undefined
  })

  let refsLoaded = false

  $: isDocChannel = !hierarchy.isDerived(object._class, chunter.class.ChunterSpace)

  $: void updateDataProvider(object._id, selectedMessageId)

  async function updateDataProvider (attachedTo: Ref<Doc>, selectedMessageId?: Ref<ActivityMessage>): Promise<void> {
    if (dataProvider === undefined) {
      const ctx =
        context ??
        (await client.findOne(notification.class.DocNotifyContext, {
          objectId: object._id,
          user: getCurrentAccount().uuid
        }))
      const hasRefs = ((object as WithReferences<Doc>).references ?? 0) > 0
      refsLoaded = hasRefs
      const space = isSpace(object) ? object._id : object.space
      dataProvider = new ChannelDataProvider(
        ctx,
        space,
        attachedTo,
        activity.class.ActivityMessage,
        selectedMessageId,
        false,
        hasRefs,
        collection
      )
    }
  }

  $: if (dataProvider && !refsLoaded && ((object as WithReferences<Doc>).references ?? 0) > 0) {
    dataProvider.loadRefs()
    refsLoaded = true
  }
</script>

{#if dataProvider}
  <ReverseChannelScrollView
    channel={object}
    bind:selectedMessageId
    {object}
    collection={collection ?? (isDocChannel ? 'comments' : 'messages')}
    provider={dataProvider}
    {freeze}
    {autofocus}
    loadMoreAllowed
    {withInput}
    {readonly}
    {onReply}
  />
{/if}
