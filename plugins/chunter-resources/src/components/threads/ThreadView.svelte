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
  import { Doc, Ref } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Breadcrumbs, location as locationStore, Header, BreadcrumbItem, Loading } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { getMessageFromLoc, messageInFocus } from '@hcengineering/activity-resources'
  import contact from '@hcengineering/contact'
  import attachment from '@hcengineering/attachment'

  import chunter from '../../plugin'
  import { getObjectIcon, getChannelName } from '../../utils'
  import { threadMessagesStore } from '../../stores'
  import ThreadContent from './ThreadContent.svelte'

  export let _id: Ref<ActivityMessage>
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let showHeader: boolean = true
  export let syncLocation = true
  export let autofocus = true
  export let onReply: ((message: ActivityMessage) => void) | undefined = undefined

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  const messageQuery = createQuery()
  const channelQuery = createQuery()

  let channel: Doc | undefined = undefined
  let message: DisplayActivityMessage | undefined = $threadMessagesStore?._id === _id ? $threadMessagesStore : undefined
  let isLoading = true
  let channelName: string | undefined = undefined

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
  })

  $: if (message && message._id !== _id) {
    message = $threadMessagesStore?._id === _id ? $threadMessagesStore : undefined
    isLoading = message === undefined
  }

  $: messageQuery.query(
    activity.class.ActivityMessage,
    { _id },
    (result: ActivityMessage[]) => {
      message = result[0] as DisplayActivityMessage
      isLoading = false
      if (message === undefined) {
        dispatch('close')
      }
    },
    {
      lookup: {
        _id: {
          attachments: attachment.class.Attachment
        }
      }
    }
  )

  $: message &&
    channelQuery.query(message.attachedToClass, { _id: message.attachedTo }, (res) => {
      channel = res[0]
    })

  $: message &&
    getChannelName(message.attachedTo, message.attachedToClass, channel).then((res) => {
      channelName = res
    })

  let breadcrumbs: BreadcrumbItem[] = []
  $: breadcrumbs = showHeader ? getBreadcrumbsItems(channel, channelName) : []

  function getBreadcrumbsItems (channel?: Doc, channelName?: string): BreadcrumbItem[] {
    if (channel === undefined) {
      return []
    }

    const isPersonAvatar =
      channel._class === chunter.class.DirectMessage || hierarchy.isDerived(channel._class, contact.class.Person)

    return [
      {
        id: 'channel',
        icon: getObjectIcon(channel._class),
        iconProps: { value: channel },
        iconWidth: isPersonAvatar ? 'auto' : undefined,
        withoutIconBackground: isPersonAvatar,
        title: channelName,
        label: channelName ? undefined : chunter.string.Channel
      },
      { id: 'thread', label: chunter.string.Thread }
    ]
  }

  function handleBreadcrumbSelect (event: CustomEvent<number>): void {
    const index = event.detail
    const breadcrumb = breadcrumbs[index]

    if (breadcrumb === undefined) return
    if (breadcrumb.id !== 'channel') return

    dispatch('channel')
  }
</script>

{#if showHeader}
  <Header type={'type-aside'} adaptive={'disabled'} closeOnEscape={false} on:close>
    <Breadcrumbs items={breadcrumbs} on:select={handleBreadcrumbSelect} selected={1} />
  </Header>
{/if}

{#if message}
  {#key _id}
    <ThreadContent bind:selectedMessageId {message} {autofocus} {onReply} />
  {/key}
{:else if isLoading}
  <Loading />
{/if}
