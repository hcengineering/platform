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
  import { Breadcrumbs, IconClose, Label, location as locationStore } from '@hcengineering/ui'
  import { createEventDispatcher, onMount } from 'svelte'
  import activity, { ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { getMessageFromLoc } from '@hcengineering/activity-resources'
  import contact from '@hcengineering/contact'

  import chunter from '../../plugin'
  import ThreadParentMessage from './ThreadParentPresenter.svelte'
  import { getObjectIcon, getChannelName } from '../../utils'
  import ChannelScrollView from '../ChannelScrollView.svelte'
  import { ChannelDataProvider } from '../../channelDataProvider'

  export let _id: Ref<ActivityMessage>
  export let selectedMessageId: Ref<ActivityMessage> | undefined = undefined
  export let showHeader: boolean = true

  const dispatch = createEventDispatcher()

  const client = getClient()
  const hierarchy = client.getHierarchy()

  const messageQuery = createQuery()
  const channelQuery = createQuery()

  let channel: Doc | undefined = undefined
  let message: DisplayActivityMessage | undefined = undefined

  let channelName: string | undefined = undefined
  let dataProvider: ChannelDataProvider | undefined = undefined

  locationStore.subscribe((newLocation) => {
    selectedMessageId = getMessageFromLoc(newLocation)
  })

  $: messageQuery.query(activity.class.ActivityMessage, { _id }, (result: ActivityMessage[]) => {
    message = result[0] as DisplayActivityMessage
  })

  $: message &&
    channelQuery.query(message.attachedToClass, { _id: message.attachedTo }, (res) => {
      channel = res[0]
    })

  $: if (message !== undefined && dataProvider === undefined) {
    dataProvider = new ChannelDataProvider(message._id, chunter.class.ThreadMessage, undefined, selectedMessageId, true)
  }

  $: message &&
    getChannelName(message.attachedTo, message.attachedToClass, channel).then((res) => {
      channelName = res
    })

  function getBreadcrumbsItems (channel?: Doc, message?: DisplayActivityMessage, channelName?: string) {
    if (message === undefined) {
      return []
    }

    const isPersonAvatar =
      message.attachedToClass === chunter.class.DirectMessage ||
      hierarchy.isDerived(message.attachedToClass, contact.class.Person)

    return [
      {
        icon: getObjectIcon(message.attachedToClass),
        iconProps: { value: channel },
        iconWidth: isPersonAvatar ? 'auto' : undefined,
        withoutIconBackground: isPersonAvatar,
        title: channelName,
        label: channelName ? undefined : chunter.string.Channel
      },
      { label: chunter.string.Thread }
    ]
  }
</script>

<div class="popupPanel panel">
  {#if showHeader}
    <div class="ac-header divide full caption-height" style="padding: 0.5rem 1rem">
      <Breadcrumbs items={getBreadcrumbsItems(channel, message, channelName)} />
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div
        class="close"
        on:click={() => {
          dispatch('close')
        }}
      >
        <IconClose size="medium" />
      </div>
    </div>
  {/if}

  <div class="popupPanel-body">
    <div class="container">
      {#if message && dataProvider !== undefined}
        <ChannelScrollView
          {selectedMessageId}
          withDates={false}
          skipLabels
          object={message}
          objectId={message._id}
          objectClass={message._class}
          provider={dataProvider}
          loadMoreAllowed={false}
        >
          <svelte:fragment slot="header">
            <div class="mt-3 mr-6 ml-6">
              <ThreadParentMessage {message} />
            </div>
            <div class="separator">
              {#if message.replies && message.replies > 0}
                <div class="label lower">
                  <Label label={activity.string.RepliesCount} params={{ replies: message.replies }} />
                </div>
              {/if}
              <div class="line" />
            </div>
          </svelte:fragment>
        </ChannelScrollView>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .close {
    margin-left: 0.75rem;
    opacity: 0.4;
    cursor: pointer;

    &:hover {
      opacity: 1;
    }
  }

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
