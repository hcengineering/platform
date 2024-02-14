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
  import { Class, Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { defineSeparators, Loading, location as locationStore, panelSeparators, Separator } from '@hcengineering/ui'
  import { DocNotifyContext } from '@hcengineering/notification'
  import activity, { ActivityMessage, ActivityMessagesFilter } from '@hcengineering/activity'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { combineActivityMessages } from '@hcengineering/activity-resources'
  import { Channel } from '@hcengineering/chunter'
  import attachment from '@hcengineering/attachment'

  import ChannelComponent from './Channel.svelte'
  import ChannelHeader from './ChannelHeader.svelte'
  import DocAside from './chat/DocAside.svelte'
  import chunter from '../plugin'
  import ChannelAside from './chat/ChannelAside.svelte'

  export let context: DocNotifyContext
  export let object: Doc | undefined = undefined
  export let allowClose = false
  export let embedded = false

  const client = getClient()
  const hierarchy = client.getHierarchy()
  const messagesQuery = createQuery()

  let activityMessages: ActivityMessage[] = []
  let isThreadOpened = false
  let isAsideShown = false
  let isLoading = true

  let filters: Ref<ActivityMessagesFilter>[] = []

  locationStore.subscribe((newLocation) => {
    isThreadOpened = newLocation.path[4] != null
  })

  $: isDocChat = !hierarchy.isDerived(context.attachedToClass, chunter.class.ChunterSpace)
  $: withAside =
    !embedded && !isThreadOpened && !hierarchy.isDerived(context.attachedToClass, chunter.class.DirectMessage)

  $: updateMessagesQuery(isDocChat ? activity.class.ActivityMessage : chunter.class.ChatMessage, context.attachedTo)

  function updateMessagesQuery (_class: Ref<Class<ActivityMessage>>, attachedTo: Ref<Doc>) {
    isLoading = true
    const res = messagesQuery.query(
      _class,
      { attachedTo },
      (res) => {
        if (_class === chunter.class.ChatMessage) {
          activityMessages = res
          isLoading = false
        } else {
          combineActivityMessages(res).then((messages) => {
            activityMessages = messages
            isLoading = false
          })
        }
      },
      {
        sort: { createdOn: SortingOrder.Ascending },
        lookup: {
          _id: { attachments: attachment.class.Attachment }
        }
      }
    )

    if (!res) {
      isLoading = false
    }
  }

  function toChannel (object?: Doc) {
    return object as Channel | undefined
  }

  function toChannelRef (ref: Ref<Doc>) {
    return ref as Ref<Channel>
  }

  defineSeparators('aside', panelSeparators)
</script>

<div class="popupPanel panel" class:embedded>
  <ChannelHeader
    _id={context.attachedTo}
    _class={context.attachedToClass}
    {object}
    {allowClose}
    {withAside}
    bind:filters
    canOpen={isDocChat}
    {isAsideShown}
    on:close
    on:aside-toggled={() => {
      isAsideShown = !isAsideShown
    }}
  />

  <div class="popupPanel-body" class:asideShown={withAside && isAsideShown && !isLoading}>
    {#if isLoading}
      <Loading />
    {:else}
      <div class="popupPanel-body__main">
        <ChannelComponent {context} {object} {filters} messages={activityMessages} />
      </div>

      {#if withAside && isAsideShown && !isLoading}
        <Separator name="aside" float={false} index={0} />
        <div class="popupPanel-body__aside" class:float={false} class:shown={withAside && isAsideShown}>
          <Separator name="aside" float index={0} />
          <div class="antiPanel-wrap__content">
            {#if hierarchy.isDerived(context.attachedToClass, chunter.class.Channel)}
              <ChannelAside
                _id={toChannelRef(context.attachedTo)}
                _class={context.attachedToClass}
                object={toChannel(object)}
              />
            {:else}
              <DocAside _id={context.attachedTo} _class={context.attachedToClass} {object} />
            {/if}
          </div>
        </div>
      {/if}
    {/if}
  </div>
</div>
