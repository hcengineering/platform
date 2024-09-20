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
  import { Breadcrumbs, Label, location as locationStore, Header, BreadcrumbItem } from '@hcengineering/ui'
  import { createEventDispatcher, onDestroy } from 'svelte'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { getMessageFromLoc, messageInFocus } from '@hcengineering/activity-resources'
  import contact from '@hcengineering/contact'
  import attachment from '@hcengineering/attachment'

  import chunter from '../../plugin'
  import ThreadParentMessage from './ThreadParentPresenter.svelte'
  import { getObjectIcon, getChannelName } from '../../utils'
  import ChannelScrollView from '../ChannelScrollView.svelte'
  import { ChannelDataProvider } from '../../channelDataProvider'

  export let _id: Ref<ActivityMessage>
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let showHeader: boolean = true

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const dispatch = createEventDispatcher()

  const messageQuery = createQuery()
  const channelQuery = createQuery()

  let channel: Doc | undefined = undefined
  let message: DisplayActivityMessage | undefined = undefined

  let channelName: string | undefined = undefined
  let dataProvider: ChannelDataProvider | undefined = undefined

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

  $: messageQuery.query(
    activity.class.ActivityMessage,
    { _id },
    (result: ActivityMessage[]) => {
      message = result[0] as DisplayActivityMessage

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

  $: if (message !== undefined && dataProvider === undefined) {
    dataProvider = new ChannelDataProvider(
      undefined,
      message.space,
      message._id,
      chunter.class.ThreadMessage,
      selectedMessageId,
      true
    )
  }

  $: message &&
    getChannelName(message.attachedTo, message.attachedToClass, channel).then((res) => {
      channelName = res
    })

  let breadcrumbs: BreadcrumbItem[] = []
  $: breadcrumbs = showHeader ? getBreadcrumbsItems(channel, message, channelName) : []

  function getBreadcrumbsItems (
    channel?: Doc,
    message?: DisplayActivityMessage,
    channelName?: string
  ): BreadcrumbItem[] {
    if (message === undefined) {
      return []
    }

    const isPersonAvatar =
      message.attachedToClass === chunter.class.DirectMessage ||
      hierarchy.isDerived(message.attachedToClass, contact.class.Person)

    return [
      {
        id: 'channel',
        icon: getObjectIcon(message.attachedToClass),
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

<div class="hulyComponent-content hulyComponent-content__container noShrink">
  {#if message && dataProvider !== undefined}
    <ChannelScrollView
      bind:selectedMessageId
      embedded
      skipLabels
      object={message}
      provider={dataProvider}
      fullHeight={false}
      fixedInput={false}
    >
      <svelte:fragment slot="header">
        <div class="mt-3">
          <ThreadParentMessage {message} />
        </div>

        {#if message.replies && message.replies > 0}
          <div class="separator">
            <div class="label lower">
              <Label label={activity.string.RepliesCount} params={{ replies: message.replies }} />
            </div>
            <div class="line" />
          </div>
        {/if}
      </svelte:fragment>
    </ChannelScrollView>
  {/if}
</div>

<style lang="scss">
  .separator {
    display: flex;
    align-items: center;
    margin: 0.5rem 0;

    .label {
      white-space: nowrap;
      margin: 0 0.5rem;
      color: var(--theme-halfcontent-color);
    }

    .line {
      background: var(--theme-refinput-border);
      height: 1px;
      width: 100%;
    }
  }
</style>
