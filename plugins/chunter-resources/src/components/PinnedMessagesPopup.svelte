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
  import { createQuery, getClient } from '@hcengineering/presentation'
  import activity, { ActivityMessage, ActivityReference } from '@hcengineering/activity'
  import { ActivityMessagePresenter, sortActivityMessages } from '@hcengineering/activity-resources'
  import { ActionIcon, IconClose, Loading } from '@hcengineering/ui'
  import { createEventDispatcher } from 'svelte'
  import { ThreadMessage } from '@hcengineering/chunter'
  import { Class, Doc, Ref, SortingOrder, Space } from '@hcengineering/core'

  import chunter from '../plugin'

  export let attachedTo: Ref<Doc>
  export let attachedToClass: Ref<Class<Doc>>
  export let space: Ref<Space>
  export let withRefs = false

  const dispatch = createEventDispatcher()
  const pinnedQuery = createQuery()
  const pinnedThreadsQuery = createQuery()
  const pinnedRefsQuery = createQuery()

  let pinnedMessages: ActivityMessage[] = []
  let pinnedThreads: ThreadMessage[] = []
  let pinnedRefs: ActivityReference[] = []

  let isPinnedLoaded = false
  let isThreadsPinnedLoaded = false
  let isPinnedRefsLoaded = false

  $: isLoaded = isPinnedLoaded && isThreadsPinnedLoaded && isPinnedRefsLoaded

  $: pinnedQuery.query(
    activity.class.ActivityMessage,
    { attachedTo, isPinned: true, space },
    (res: ActivityMessage[]) => {
      pinnedMessages = res
      isPinnedLoaded = true
    }
  )

  $: pinnedThreadsQuery.query(
    chunter.class.ThreadMessage,
    { objectId: attachedTo, isPinned: true, space },
    (res: ThreadMessage[]) => {
      pinnedThreads = res
      isThreadsPinnedLoaded = true
    }
  )

  $: if (withRefs) {
    pinnedRefsQuery.query(
      activity.class.ActivityReference,
      { attachedTo, isPinned: true, space: { $ne: space } },
      (res) => {
        pinnedRefs = res
        isPinnedRefsLoaded = true
      }
    )
  } else {
    isPinnedRefsLoaded = true
  }

  $: if (isLoaded && pinnedMessages.length === 0 && pinnedThreads.length === 0 && pinnedRefs.length === 0) {
    dispatch('close', undefined)
  }

  async function unpinMessage (message: ActivityMessage): Promise<void> {
    await getClient().update(message, { isPinned: false })
  }

  $: displayMessages = sortActivityMessages(
    pinnedMessages.concat(pinnedThreads).concat(pinnedRefs),
    SortingOrder.Descending
  )
</script>

<div class="antiPopup vScroll popup">
  {#if displayMessages.length === 0}
    <Loading size="small" />
  {/if}
  {#each displayMessages as message}
    <div class="message relative">
      <ActivityMessagePresenter
        value={message}
        withActions={false}
        hoverable={false}
        skipLabel={true}
        onClick={() => {
          dispatch('close', message)
        }}
      />
      <div class="actions">
        <ActionIcon
          size="small"
          icon={IconClose}
          action={() => {
            void unpinMessage(message)
          }}
        />
      </div>
    </div>
  {/each}
</div>

<style lang="scss">
  .message {
    min-width: 30rem;
    border-radius: var(--medium-BorderRadius);

    .actions {
      visibility: hidden;
      position: absolute;
      top: -0.5rem;
      right: 0.85rem;
      box-shadow: 0.25rem 0.75rem 1rem 0.125rem var(--global-popover-ShadowColor);
      border: 1px solid var(--global-subtle-ui-BorderColor);
      background: linear-gradient(0deg, var(--global-surface-01-BorderColor), var(--global-surface-01-BorderColor)),
        linear-gradient(0deg, var(--global-ui-BackgroundColor), var(--global-ui-BackgroundColor));
      padding: var(--spacing-0_5);
      border-radius: var(--small-BorderRadius);
    }

    &:hover > .actions {
      visibility: visible;
    }

    &:hover {
      background-color: var(--global-ui-BackgroundColor);
    }
  }

  .antiPopup {
    max-width: 40rem;
  }
  .popup {
    padding: 1rem;
    max-height: 24.5rem;
    color: var(--caption-color);
  }
</style>
