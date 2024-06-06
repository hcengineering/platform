<!--
// Copyright © 2022 Hardcore Engineering Inc.
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
  import activity, { ActivityExtension, ActivityMessage, DisplayActivityMessage } from '@hcengineering/activity'
  import { Doc, Ref, SortingOrder } from '@hcengineering/core'
  import { createQuery, getClient } from '@hcengineering/presentation'
  import { Grid, Label, Spinner, location, Lazy } from '@hcengineering/ui'
  import { onDestroy, onMount } from 'svelte'

  import ActivityExtensionComponent from './ActivityExtension.svelte'
  import ActivityFilter from './ActivityFilter.svelte'
  import { combineActivityMessages } from '../activityMessagesUtils'
  import { canGroupMessages, getMessageFromLoc } from '../utils'
  import ActivityMessagePresenter from './activity-message/ActivityMessagePresenter.svelte'
  import { messageInFocus } from '../activity'

  export let object: Doc
  export let showCommenInput: boolean = true
  export let transparent: boolean = false
  export let focusIndex: number = -1
  export let boundary: HTMLElement | undefined = undefined

  const client = getClient()
  const activityMessagesQuery = createQuery()

  let extensions: ActivityExtension[] = []

  let filteredMessages: DisplayActivityMessage[] = []
  let activityMessages: ActivityMessage[] = []
  let isLoading = false

  let activityBox: HTMLElement | undefined
  let selectedMessageId: Ref<ActivityMessage> | undefined = undefined

  let shouldScroll = true
  let isAutoScroll = false
  let prevScrollTimestamp = 0
  let timer: any

  let prevContainerHeight = -1
  let prevContainerWidth = -1

  const unsubscribe = messageInFocus.subscribe((id) => {
    if (id !== undefined) {
      selectedMessageId = id
      shouldScroll = true
      void scrollToMessage(id)
      messageInFocus.set(undefined)
    }
  })

  const unsubscribeLocation = location.subscribe((loc) => {
    const id = getMessageFromLoc(loc)

    if (id === undefined) {
      boundary?.scrollTo({ top: 0 })
      selectedMessageId = undefined
    }

    messageInFocus.set(id)
  })

  onMount(() => {
    if (!boundary) {
      return
    }

    boundary.addEventListener('wheel', () => {
      shouldScroll = false
    })

    boundary.addEventListener('scroll', (a) => {
      const diff = a.timeStamp - prevScrollTimestamp

      if (!isAutoScroll) {
        shouldScroll = false
      }

      isAutoScroll = isAutoScroll ? diff < 100 || prevScrollTimestamp === 0 : false
      prevScrollTimestamp = a.timeStamp
    })
  })

  onDestroy(() => {
    unsubscribe()
    unsubscribeLocation()
  })

  function restartAnimation (el: HTMLElement): void {
    el.style.animation = 'none'
    el.focus()
    el.style.animation = ''
  }

  function tryScrollToMessage (delay: number = 100): void {
    if (timer) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      void scrollToMessage(selectedMessageId)
    }, delay)
  }

  async function scrollToMessage (id?: Ref<ActivityMessage>): Promise<void> {
    if (!id || boundary == null || activityBox == null) {
      return
    }

    const messagesElements = activityBox.getElementsByClassName('activityMessage')
    const msgElement = messagesElements[id as any] as HTMLElement | undefined

    if (msgElement == null && filteredMessages.some((msg) => msg._id === id)) {
      tryScrollToMessage()
      return
    } else if (msgElement == null) {
      return
    }

    shouldScroll = true
    isAutoScroll = true
    prevScrollTimestamp = 0

    restartAnimation(msgElement)
    msgElement.scrollIntoView({ behavior: 'instant' })
  }

  export function onContainerResized (container: HTMLElement): void {
    if (!shouldScroll) return

    if (prevContainerWidth > 0 && container.clientWidth !== prevContainerWidth) {
      shouldScroll = false
      return
    }

    if (
      selectedMessageId &&
      container.clientHeight !== prevContainerHeight &&
      container.clientHeight > prevContainerHeight
    ) {
      // A little delay to avoid a lot of jumping/twitching
      tryScrollToMessage(300)
    }

    prevContainerHeight = container.clientHeight
    prevContainerWidth = container.clientWidth
  }

  let isNewestFirst = JSON.parse(localStorage.getItem('activity-newest-first') ?? 'false')

  $: void client.findAll(activity.class.ActivityExtension, { ofClass: object._class }).then((res) => {
    extensions = res
  })

  async function updateActivityMessages (objectId: Ref<Doc>, order: SortingOrder): Promise<void> {
    isLoading = true

    const res = activityMessagesQuery.query(
      activity.class.ActivityMessage,
      { attachedTo: objectId },
      (result: ActivityMessage[]) => {
        void combineActivityMessages(result, order).then((messages) => {
          activityMessages = messages
          isLoading = false
        })
      },
      {
        sort: {
          createdOn: SortingOrder.Ascending
        }
      }
    )
    if (!res) {
      isLoading = false
    }
  }

  $: areMessagesLoaded = !isLoading && filteredMessages.length > 0

  $: if (activityBox && areMessagesLoaded) {
    shouldScroll = true
    void scrollToMessage(selectedMessageId)
  }

  $: void updateActivityMessages(object._id, isNewestFirst ? SortingOrder.Descending : SortingOrder.Ascending)
</script>

<div class="antiSection-header high mt-9" class:invisible={transparent}>
  <span class="antiSection-header__title flex-row-center">
    <Label label={activity.string.Activity} />
    {#if isLoading}
      <div class="ml-1">
        <Spinner size="small" />
      </div>
    {/if}
  </span>
  <ActivityFilter
    messages={activityMessages}
    {object}
    on:update={(e) => {
      filteredMessages = e.detail
    }}
    bind:isNewestFirst
  />
</div>
{#if isNewestFirst && showCommenInput}
  <div class="ref-input newest-first">
    <ActivityExtensionComponent kind="input" {extensions} props={{ object, boundary, focusIndex }} />
  </div>
{/if}
<div
  class="p-activity select-text"
  id={activity.string.Activity}
  class:newest-first={isNewestFirst}
  bind:this={activityBox}
>
  {#if filteredMessages.length}
    <Grid column={1} rowGap={0}>
      {#each filteredMessages as message, index}
        {@const canGroup = canGroupMessages(message, filteredMessages[index - 1])}
        {#if selectedMessageId}
          <ActivityMessagePresenter
            value={message}
            doc={object}
            hideLink={true}
            type={canGroup ? 'short' : 'default'}
            isHighlighted={selectedMessageId === message._id}
          />
        {:else}
          <Lazy>
            <ActivityMessagePresenter
              value={message}
              doc={object}
              hideLink={true}
              type={canGroup ? 'short' : 'default'}
              isHighlighted={selectedMessageId === message._id}
            />
          </Lazy>
        {/if}
      {/each}
    </Grid>
  {/if}
</div>
{#if showCommenInput && !isNewestFirst}
  <div class="ref-input oldest-first">
    <ActivityExtensionComponent kind="input" {extensions} props={{ object, boundary, focusIndex }} />
  </div>
{/if}

<style lang="scss">
  .ref-input {
    flex-shrink: 0;
    &.newest-first {
      margin-bottom: 1rem;
      padding-top: 1rem;
    }
    &.oldest-first {
      padding-bottom: 2.5rem;
    }
  }

  .p-activity {
    &.newest-first {
      padding-bottom: 1.75rem;
    }
    &:not(.newest-first) {
      margin: 1.75rem 0;
    }
  }

  .invisible {
    display: none;
  }

  :global(.grid .msgactivity-container.showIcon:last-child::after) {
    content: none;
  }
</style>
