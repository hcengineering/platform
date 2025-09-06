<!--
// Copyright © 2025 Hardcore Engineering Inc.
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
  import { Card } from '@hcengineering/card'
  import { NotificationContext } from '@hcengineering/communication-types'
  import { createEventDispatcher, onMount } from 'svelte'
  import { MessagesNavigationAnchors } from '@hcengineering/communication'

  import MessagesList from './MessagesList.svelte'

  export let readonly: boolean = false
  export let doc: Card
  export let notificationContext: NotificationContext | undefined = undefined
  export let isLoadingBefore: boolean = false
  export let isContextLoaded: boolean = false
  export let scrollDiv: HTMLDivElement | undefined | null = undefined
  export let contentDiv: HTMLDivElement | undefined | null = undefined
  export let active: boolean = false
  export let navigation: MessagesNavigationAnchors | string = MessagesNavigationAnchors.ConversationStart

  const dispatch = createEventDispatcher()

  let list: MessagesList | undefined = undefined

  let position: MessagesNavigationAnchors =
    navigation === MessagesNavigationAnchors.LatestMessages
      ? MessagesNavigationAnchors.LatestMessages
      : MessagesNavigationAnchors.ConversationStart
  let shouldScrollToStart = false

  export function navigate (id: MessagesNavigationAnchors) {
    if (id !== MessagesNavigationAnchors.ConversationStart) {
      shouldScrollToStart = false
    } else {
      shouldScrollToStart = true
      contentDiv?.scrollIntoView({ behavior: 'instant', block: 'start' })
    }
    position = id
  }

  export function scrollDown (): void {
    shouldScrollToStart = false
    position = MessagesNavigationAnchors.LatestMessages
    list?.scrollDown()
  }

  export function canScrollDown (): boolean {
    return list?.canScrollDown() ?? false
  }

  onMount(() => {
    if (active && navigation === MessagesNavigationAnchors.LatestMessages) {
      position = MessagesNavigationAnchors.LatestMessages
      dispatch('action', { id: 'overlay', show: true })
    }
  })
</script>

{#if scrollDiv != null && isContextLoaded && contentDiv != null}
  <div class="section-messages">
    <MessagesList
      bind:this={list}
      card={doc}
      {readonly}
      context={notificationContext}
      {scrollDiv}
      {contentDiv}
      bind:position
      shouldScrollToStart={active && position === MessagesNavigationAnchors.ConversationStart && shouldScrollToStart}
      {isLoadingBefore}
      on:change
      on:action
      on:loaded={() => {
        dispatch('action', { id: 'overlay', show: false })
        dispatch('loaded')
      }}
    />
  </div>
{/if}

<style lang="scss">
  .section-messages {
    display: flex;
    flex-direction: column;
    flex: 1;
    width: 100%;
  }
</style>
